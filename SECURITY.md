# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within ShortFormFactory, please send an email to **security@shortformfactory.com**.

All security vulnerabilities will be promptly addressed. Please do not publicly disclose the issue until it has been addressed by our team.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Resolution:** Depends on severity and complexity

## Security Measures

This application implements the following security measures:

### Payment Processing
- All payments processed through **Stripe** and **PayPal** (PCI-DSS compliant)
- No credit card data stored on our servers
- HTTPS enforced on all pages

### Data Protection
- Environment variables for all sensitive credentials
- API keys never exposed in client-side code
- Input validation on all form submissions

### Infrastructure
- Hosted on Vercel with automatic SSL/TLS
- DDoS protection enabled
- Regular security updates

## Responsible Disclosure

We appreciate the security research community's efforts in helping keep ShortFormFactory and our users safe. We are committed to working with security researchers to verify and address potential vulnerabilities.

Thank you for helping keep ShortFormFactory secure.
