package com.shrihari.backend.demo.service;

import com.shrihari.backend.demo.dto.DemoSeedResponse;
import com.shrihari.backend.expense.dto.ExpenseCreateRequest;
import com.shrihari.backend.expense.dto.ExpenseResponse;
import com.shrihari.backend.expense.model.Expense;
import com.shrihari.backend.expense.repository.ExpenseRepository;
import com.shrihari.backend.expense.repository.ExpenseSplitRepository;
import com.shrihari.backend.expense.service.ExpenseService;
import com.shrihari.backend.ledger.dto.LedgerResponse;
import com.shrihari.backend.ledger.model.Settlement;
import com.shrihari.backend.ledger.repository.SettlementRepository;
import com.shrihari.backend.ledger.service.LedgerEngine;
import com.shrihari.backend.member.dto.MemberCreateRequest;
import com.shrihari.backend.member.dto.MemberResponse;
import com.shrihari.backend.member.repository.TripMemberRepository;
import com.shrihari.backend.member.service.TripMemberService;
import com.shrihari.backend.trip.dto.TripCreateRequest;
import com.shrihari.backend.trip.dto.TripResponse;
import com.shrihari.backend.trip.model.Trip;
import com.shrihari.backend.trip.repository.TripRepository;
import com.shrihari.backend.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DemoSeedService {

    private final TripRepository tripRepository;
    private final TripMemberRepository memberRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository splitRepository;
    private final SettlementRepository settlementRepository;

    private final TripService tripService;
    private final TripMemberService memberService;
    private final ExpenseService expenseService;
    private final LedgerEngine ledgerEngine;

    public static final String DEMO_TRIP_ID = "trip_bali_2026";

    @Transactional
    public DemoSeedResponse seedDemoTrip() {
        log.info("Resetting and seeding demo trip: {}", DEMO_TRIP_ID);

        // 1. Clean existing records for this demo trip
        cleanDemoTrip(DEMO_TRIP_ID);

        // 2. Create the showcase Trip
        TripResponse trip = tripService.createTrip(TripCreateRequest.builder()
                .tripId(DEMO_TRIP_ID)
                .name("Bali Villa & Surf Retreat 2026")
                .currency("USD")
                .build());

        // 3. Register the 4 showcase members
        List<MemberResponse> members = new ArrayList<>();

        members.add(memberService.addMember(DEMO_TRIP_ID, MemberCreateRequest.builder()
                .userId("user_sarah")
                .name("Sarah Connor")
                .handle("@sarah_c")
                .paypalEmail("sarah.organizer@personal.example.com")
                .role("ORGANIZER")
                .roastConsent("SPICY")
                .build()));

        members.add(memberService.addMember(DEMO_TRIP_ID, MemberCreateRequest.builder()
                .userId("user_alex")
                .name("Alex Hunter")
                .handle("@alex_travels")
                .paypalEmail("alex.debtor@personal.example.com")
                .role("MEMBER")
                .roastConsent("SPICY")
                .build()));

        members.add(memberService.addMember(DEMO_TRIP_ID, MemberCreateRequest.builder()
                .userId("user_dave")
                .name("Dave Miller")
                .handle("@dave_m")
                .paypalEmail("dave.payer@personal.example.com")
                .role("MEMBER")
                .roastConsent("MILD")
                .build()));

        members.add(memberService.addMember(DEMO_TRIP_ID, MemberCreateRequest.builder()
                .userId("user_priya")
                .name("Priya Sharma")
                .handle("@priya_s")
                .paypalEmail("priya.traveler@personal.example.com")
                .role("MEMBER")
                .roastConsent("NO_ROAST")
                .build()));

        List<String> memberIds = members.stream().map(MemberResponse::getUserId).toList();

        // 4. Log showcase expenses
        List<ExpenseResponse> expenses = new ArrayList<>();

        // Expense 1: Sarah fronts $240 Sunset Villa Deposit split EQUALLY across all 4 ($60 each)
        expenses.add(expenseService.createExpense(DEMO_TRIP_ID, ExpenseCreateRequest.builder()
                .expenseId("exp_villa_demo_01")
                .paidBy("user_sarah")
                .amountCents(24000L)
                .description("Sunset Cliffside Villa Deposit")
                .category("LODGING")
                .splitType("EQUAL")
                .splitWithUserIds(memberIds)
                .build()));

        // Expense 2: Dave fronts $120 Jimbaran Seafood Dinner split EQUALLY between Alex & Dave ($60 each)
        expenses.add(expenseService.createExpense(DEMO_TRIP_ID, ExpenseCreateRequest.builder()
                .expenseId("exp_dinner_demo_02")
                .paidBy("user_dave")
                .amountCents(12000L)
                .description("Jimbaran Beach Seafood Dinner")
                .category("FOOD")
                .splitType("EQUAL")
                .splitWithUserIds(List.of("user_alex", "user_dave"))
                .build()));

        // 5. Fetch updated Ledger
        LedgerResponse ledger = ledgerEngine.getTripLedger(DEMO_TRIP_ID);

        return DemoSeedResponse.builder()
                .message("Demo trip " + DEMO_TRIP_ID + " successfully seeded with 4 members, 2 fronted expenses, and simplified debts.")
                .trip(trip)
                .memberIds(memberIds)
                .members(members)
                .expenses(expenses)
                .ledger(ledger)
                .build();
    }

    private void cleanDemoTrip(String tripId) {
        List<Settlement> settlements = settlementRepository.findByTripIdOrderByCreatedAtDesc(tripId);
        settlementRepository.deleteAll(settlements);

        List<Expense> expenses = expenseRepository.findByTripIdOrderByTimestampDesc(tripId);
        expenseRepository.deleteAll(expenses);

        memberRepository.deleteAll(memberRepository.findByTripIdOrderByJoinedAtAsc(tripId));

        if (tripRepository.existsById(tripId)) {
            tripRepository.deleteById(tripId);
        }
    }
}
