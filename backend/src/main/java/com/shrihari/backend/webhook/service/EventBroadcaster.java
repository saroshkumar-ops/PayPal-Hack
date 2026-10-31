package com.shrihari.backend.webhook.service;

import com.shrihari.backend.webhook.dto.CelebrationEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Component
public class EventBroadcaster {

    private static final Long EMITTER_TIMEOUT = 300_000L; // 5 minutes

    private final Map<String, List<SseEmitter>> tripEmitters = new ConcurrentHashMap<>();
    private final List<SseEmitter> globalEmitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe(String tripId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT);
        List<SseEmitter> list = tripEmitters.computeIfAbsent(tripId, k -> new CopyOnWriteArrayList<>());
        list.add(emitter);

        emitter.onCompletion(() -> list.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            list.remove(emitter);
        });
        emitter.onError(e -> list.remove(emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of("message", "Subscribed to trip events", "trip_id", tripId)));
        } catch (IOException e) {
            list.remove(emitter);
        }

        return emitter;
    }

    public SseEmitter subscribeGlobal() {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT);
        globalEmitters.add(emitter);

        emitter.onCompletion(() -> globalEmitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            globalEmitters.remove(emitter);
        });
        emitter.onError(e -> globalEmitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of("message", "Subscribed to global TripSheriff events")));
        } catch (IOException e) {
            globalEmitters.remove(emitter);
        }

        return emitter;
    }

    public void broadcast(CelebrationEvent event) {
        log.info("Broadcasting celebration event: {} to trip {}", event.getEventType(), event.getTripId());

        // Dispatch to trip-specific listeners
        if (event.getTripId() != null) {
            List<SseEmitter> emitters = tripEmitters.get(event.getTripId());
            if (emitters != null) {
                for (SseEmitter emitter : emitters) {
                    try {
                        emitter.send(SseEmitter.event()
                                .name(event.getEventType())
                                .data(event));
                    } catch (Exception e) {
                        emitters.remove(emitter);
                    }
                }
            }
        }

        // Dispatch to global listeners
        for (SseEmitter emitter : globalEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(event.getEventType())
                        .data(event));
            } catch (Exception e) {
                globalEmitters.remove(emitter);
            }
        }
    }
}
