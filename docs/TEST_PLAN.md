# Stadium Squares release test plan

## Automated gate

Run `npm test` and `npm run check`. GitHub Actions runs tests, linting,
TypeScript and the production build for every pull request.

## Stripe test mode

- Successful card payment moves a reservation from `payment_pending` to `paid`.
- 3DS authentication returns to the verified thank-you page.
- Failed and cancelled payments release the square.
- An abandoned checkout is cancelled and released after the reservation window.
- Replayed webhook events do not resend emails or repeat state changes.
- A delayed `processing` payment is never deleted by cleanup.
- Two simultaneous attempts for one coordinate produce one PaymentIntent and one 409 response.

## Privacy and tenant isolation

- Anonymous Supabase clients cannot select protected tables or analytics.
- Public board responses contain no email, rejection, payment or commercial fields.
- A club admin cannot read another club or write directly to protected tables.
- Admin API attempts against another tenant return 403.

## Mobile and accessibility

Test at 320px, 375px and 430px widths. Confirm mobile navigation, a payment
journey without horizontal scrolling, visible focus, announced errors, and the
keyboard-operated row/column square selector.

## Operational checks

Confirm timezone-aware daily digests, all sponsor positions, CSV formula safety,
and rejection of executable or disguised image uploads.
