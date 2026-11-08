# Campaign conditions

conditions is a JSON tree. Every node has a type. Groups `{ "type": "and", "children": [...] }` or `or` can be nested. children holds 1–20 nodes. The whole tree can have at most 100 nodes and a depth of 8.

| type | Other fields | Meaning |
| --- | --- | --- |
| always | None | Adds no restriction |
| authenticated | None | Signed in |
| verified_email | None | Verified email address |
| email | addresses: 1–100 emails | Email allowlist; matches only a verified email |
| email_domain | domains: 1–100 domains | Email domain allowlist; matches only a verified email |
| passphrase | credentialId | Campaign passphrase credential |
| invitation | credentialId | Invitation credential |
| time | At least one of startsAt, endsAt | Time range in milliseconds; startsAt must be earlier than endsAt, and endsAt is exclusive |
| purchase | productId, minimum (default 1) | Number of paid Keydrop orders that are not fully refunded |
| question | id, label, kind, required, options, optional correct | Survey question and answer check |
| external | hookId | Eligibility hook or external API registered by the deployer |

question.kind is text, single or multiple. For text, options is an empty array, and correct, if given, is a string. Options hold at most 30 items of up to 200 characters. For single, options has at least two items, and correct is one of those strings. For multiple, correct is an array of option strings. Options must be unique, and question.id must be unique within one tree. Without correct, answers are validated only for required fields and format, not against a correct answer.

Raw passphrase and invitation values are not written into conditions. Set up the matching credentials in the dashboard. external.hookId must be registered in code by the deployer beforehand. Arbitrary URLs are not accepted. When a purchase condition is managed through the API, the token must also be authorized for its productId.

```json
{
  "type": "and",
  "children": [
    { "type": "verified_email" },
    { "type": "email_domain", "domains": ["example.com"] }
  ]
}
```

Admin API responses contain the full conditions, which may include the correct survey answers. Only give them to trusted backends or agents. Never embed an admin token in a public frontend. The public claim page builds separate, visitor-safe survey data.
