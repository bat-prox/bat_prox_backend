# Payment APIs

## Deposit APIs Complete:
- [x] POST /payment/user/deposit
- [x] GET /payment/admin/deposits
- [x] PUT /payment/admin/deposits/:id/status

## Withdraw APIs (Pending):
- [ ] POST /payment/user/withdraw {amount, account_title, bank_name, account_number}
- [ ] GET /payment/admin/withdraws (with user name)
- [ ] PUT /payment/admin/withdraws/:id/status

Details: Reuse transactions table, type='withdraw'.
