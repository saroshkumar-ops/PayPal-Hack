package com.shrihari.backend.ledger.repository;

import com.shrihari.backend.ledger.model.Settlement;
import com.shrihari.backend.ledger.model.SettlementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, String> {

    List<Settlement> findByTripIdOrderByCreatedAtDesc(String tripId);

    List<Settlement> findByTripIdAndStatus(String tripId, SettlementStatus status);
}
