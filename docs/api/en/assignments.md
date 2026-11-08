# Direct assignment by the administrator

In a product's code vault, select one code, click "Assign selected code", and enter the email of an existing account and an internal note. This action needs no campaign or payment. It does not skip the inventory, expiry, source-sync or archived-product checks. The recipient must create an account first. Entering an email does not register a user or mark the address as verified.

The recipient sees "Assigned by administrator" in "My codes". Verified recipients go through the automatic code email queue. Without email configured, they can still view the code on the site. Unverified addresses get no code email. The scheduled job can add it after the address is verified.

## Admin API

POST /api/assignments requires an administrator session and a same-site Origin. JSON:

```json
{
  "productId": "product UUID",
  "codeId": "code UUID",
  "email": "recipient@example.com",
  "note": "reason for support reissue",
  "idempotencyKey": "a fixed UUID per assignment"
}
```

The response contains id, productId, codeId, userId and createdAt. It does not return the plaintext code. Resending with the same administrator, idempotency key and content returns the original record. Reusing the key with different content returns ASSIGNMENT_CONFLICT. When the result is unknown, the browser keeps the original request and offers a retry. Do not treat an unconfirmed result as a failure and send a new assignment.

GET /api/assignments?productId=UUID&page=1 returns 25 records per page, with page and hasMore. Each record has the code ID, recipient account, current email, administrator ID, API token ID (null for direct dashboard actions), internal note, time and code status. Only an administrator session can query it. The email is the account's current address, not a stored copy of the address at assignment time.

## API keys and MCP

POST /api/v1/operations uses a Bearer API token:

- `codes.assign`: add `action: "codes.assign"` to the JSON above. It needs `codes:issue` and scope for the product. This is an administrative direct assignment and does not check campaign eligibility. Campaign issuance still uses `codes.issue`.
- `assignments.read`: pass action, productId and page. It needs `codes:read` and scope for the product. The results include recipient emails and internal notes, so keep them confidential.

The matching MCP tools are `assign_code` and `list_code_assignments`. Write tools also require the token's MCP write switch, which is off by default. Resending with the same token, UUID and content through the API or MCP returns the same record. UUIDs are counted separately per token, so one token cannot fetch another token's result. A revoked or expired token cannot resend. When a new assignment is submitted, the database checks the token and product permissions again.

In the record, assigned_by is the authorizing administrator of this single-administrator deployment, and api_token_id is the delegated token actually used. Token secrets and plaintext codes are never returned.

## Inventory and entitlements

- A unique code can be assigned only if it is available and not reserved, allocated or used. Assignment cannot overwrite an existing holder.
- For a shared code, assignments, campaign claims, payment reservations and deliveries share the same slots. If the account already holds the code, the assignment uses no extra slot.
- The assignment, the inventory status and the webhook event are committed in one database transaction. No fake payment or campaign record is created.
- Redemption uses the batch's default entitlement rules, not the rules of other campaigns. Only the assigned account can redeem a unique code. Shared license keys keep devices separate per holder.
- Revoke and restore in the code vault still act on the whole code. For a shared code this affects every holder. Assignment records cannot be edited, and individual assignments cannot be transferred or withdrawn.

The `code.assigned` webhook data contains assignmentId, codeId and userId. It does not contain the plaintext code, email or internal note. It uses the existing subscription, signature and retry protocol.

`note` is required and must be 1–1000 characters. Errors:

| Status | Code | Meaning |
|---|---|---|
| 404 | `ASSIGNMENT_USER_NOT_FOUND` | No account with that recipient |
| 409 | `ASSIGNMENT_UNAVAILABLE` | The code is not available for assignment, for example it is already assigned to this account, used, revoked or expired |
| 409 | `ASSIGNMENT_CONFLICT` | The idempotency key was reused with different content |
