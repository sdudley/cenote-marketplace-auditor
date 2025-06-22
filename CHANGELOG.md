# Changelog

## [0.2.1] - 2025-06-21

- docker-compose.yaml now defaults to latest version of container
- Fix missing user-visible version number

## [0.2.0] - 2025-06-21

### ✨ Major New Features
- **Price math display** - The transaction reconcile dialog now shows the full price calculation formula and details
- **Custom column configuration** - Drag-and-drop interface for reordering and showing/hiding columns
- **Transaction filters** - Added filters for Sale Type, Hosting, App, and Reconciliation Status
- **License filters** - Added filters for License Type (multi-select), Status, Hosting, and App
- **Transaction and license export** - Add buttons to download individual transaction and license data (in details dialog for current or historical record)
- **Human-readable names in license/transaction detail view** - We format keys to be human-readable instead of displaying JSON keys
- **Enhanced diff views** - Add red strikeout of key names and child objects in diff views
- **Sandbox license annotations** - Sandbox licenses are now colored
- **Dual licensing annotations** - Transactions now call out dual licensing

#### Data Display Enhancements
- **Discounts column** - Add "Discounts" column to transaction list to show contents of Atlassian discount field
- **Maintenance date range** - Add transaction list column with full maintenance date range
- **Discounts array usage** - Instead of guessing Solutions Partner discounts, use the discounts array
- **Auto-reconciliation of more free transactions** - Auto-reconcile more types of licenses that should be free
- **Re-reconciliation logic** - Re-reconcile old versions of transactions if our pricing logic has been corrected

### 🐛 Bug Fixes

- **Entitlement ID handling** - Fix error importing transactions and licenses that had no entitlementIds
- **Sandbox detection** - Fix bug causing non-sandbox transactions to be considered sandbox
- **Price calculation** - Fix price calculation for 0-day transactions
- **Reconcile notes** - Fixed bug with reconcile notes when viewing multiple transactions
- **Nested object display** - Fix version diff display to properly show added nested objects
- **Solutions Partner discount** - Add 20% as a valid Solutions Partner discount for cloud sales

## [0.1.0] - 2025-06-13

### Initial Release
- Initial version of the Marketplace Auditor application
- Basic transaction and license management functionality
- Core reconciliation and pricing features
