package com.shrihari.backend.expense.repository;

import com.shrihari.backend.expense.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, String> {

    List<Expense> findByTripIdOrderByTimestampDesc(String tripId);

    List<Expense> findByTripIdOrderByTimestampAsc(String tripId);
}
