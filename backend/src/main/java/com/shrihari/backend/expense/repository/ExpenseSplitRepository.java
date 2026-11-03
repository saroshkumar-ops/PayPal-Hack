package com.shrihari.backend.expense.repository;

import com.shrihari.backend.expense.model.ExpenseSplit;
import com.shrihari.backend.expense.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, String> {

    List<ExpenseSplit> findByExpenseId(String expenseId);

    List<ExpenseSplit> findByUserId(String userId);

    Optional<ExpenseSplit> findByPaypalOrderId(String paypalOrderId);

    Optional<ExpenseSplit> findByExpenseIdAndUserId(String expenseId, String userId);

    List<ExpenseSplit> findByUserIdAndPaidStatus(String userId, PaymentStatus paidStatus);
}
