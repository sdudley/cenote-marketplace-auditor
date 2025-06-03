# Cenote Marketplace Auditor

An application that audits transactions and licenses from the Atlassian Marketplace API.

## Features

- Downloads transactions and licenses from the Atlassian Marketplace API
- Tracks version history of all transactions and licenses
- Validates transactions and licenses to ensure that sales are correctly priced and
license transitions are supported by related transactions.
- Runs in a Docker container for easy deployment
- Manages a list of addons for tracking
- Manages historical pricing data to allow auditing of transactions for apps where
prior price changes occurred.

## Prerequisites

- Docker and Docker Compose
- Atlassian API token for an Atlassian account that has access to the Marketplace API. This user's permissions
(configured on the Marketplace "Team" tab) must include at least: "View sales reports" and "View all other reports".
Authentication requires a new or existing API token created via: https://id.atlassian.com/manage-profile/security/api-tokens
- Atlassian vendor ID. If you are not sure of your vendor ID, visit the Marketplace dashboard for your
vendor account, and find it in the URL as: "https://marketplace.atlassian.com/manage/vendors/<vendorId>/addons"
- At least one Paid-by-Atlassian app that has Cloud or DC hosting. Pricing calculations for Server licenses
are not implemented.

## Setup

1. Clone the repository
2. Create a new `.env` file. Update the first three environment variables as indicated:
   ```
   ATLASSIAN_ACCOUNT_USER=<email of Atlassian user account used for accessing Marketplace reports>
   ATLASSIAN_ACCOUNT_API_TOKEN=<API token for associated Atlassian user account>
   ATLASSIAN_VENDOR_ID=<numeric vendor ID>
   DB_HOST=db
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=marketplace_auditor
   ```

3. Start the containers:
   ```bash
   docker-compose up -d
   ```

## Usage notes

When the app is first run, it will:

# Download a list of all paid apps keys that are owned by the Atlassian user account.
# Fetch current pricing for all of these apps.
# Download a list of all transactions and licenses for the account
# Validate the pricing of all transactions.

Running the app subsequently will download any new updates to licenses or transactions (storing
old versions of transactions/licenses in historical table for later analysis), and also validate
recent transactions.

## Managing Addons

Although the app should automatically add a list of all apps to be tracked, to manually add a new
addon to be tracked, the following can be run from the command line:

```bash
npm run add-addon -- <addon-key>
```

For example:
```bash
npm run add-addon -- com.atlassian.confluence.plugins.confluence-questions
```

### Managing Ignored Fields

The application tracks changes to transactions and licenses, but some fields may change on a frequent
basis due to Atlassian processing errors, despite no substantive transaction or license data actually changing.

These fields can be marked as "ignored" to prevent the creation of large numbers of version history entries
unnecessarily. Fields are described via their JSONPath within a license or transaction record.

The default list of ignored fields are:

Licenses:
- `lastUpdated`

Transactions:
- `lastUpdated`
- `purchaseDetails.parentProductEdition`
- `purchaseDetails.changeInParentProductEdition`
- `purchaseDetails.oldParentProductEdition`

To add a field to the ignored list:

```bash
npm run add-ignored-field -- <record-type> <field-name>
```

Where:
- `record-type` is either "transaction" or "license"
- `field-name` is the JSON path to the field (e.g., "lastUpdated" or "purchaseDetails.parentProductEdition")

For example:
```bash
npm run add-ignored-field -- license lastUpdated
npm run add-ignored-field -- transaction purchaseDetails.parentProductEdition
```

## Managing Pricing Data

If you have previously updated the pricing for your app, you must provide the prior pricing
details so that it can calculate the correct pricing for app sales in that period, as well
as any current-time upgrades to apps that were originally licensed during the prior pricing period.

Before adding prior-period pricing data, you need to fetch the current pricing from the Marketplace
API, which will populate the pricing tables with the potential tiers. This will be done automatically
when the app is run, but you can request only a download of pricing information as follows:

```bash
npm start -- --with-pricing
```

### Prepare For Prior Pricing Periods by Exporting Pricing Template

To be able to set new pricing for an app, we first need to know the possible pricing tiers. This
is extrapolated from the current pricing that was previously downloaded, which can be used to
create a .CSV template into which you can provide new pricing information.

At the first step to setting prior pricing, export a pricing template for a specific addon and
deployment type using the following command, where <deployment-type> is either
"cloud", "datacenter" or "server":

```bash
npm run export-pricing-template -- <addon-key> <deployment-type>
```

For example:
```bash
npm run export-pricing-template -- com.atlassian.confluence.plugins.confluence-questions datacenter
```

This will create a CSV file with the current pricing tiers that you can use as a template for importing new pricing.

### Importing Prior-Period Pricing Data

After editing the .CSV file to set the prior period pricing, run the following command to import it. You must
provide the start date and end date for when this pricing was effective. This will export a CSV template using
the tiers defined for the current pricing, as well as copies of the current actual pricing.

This feature does not (currently) provide any editing capability for existing periods. If you make a mistake, you
will either need to edit the data in the database manually, or else delete all of the pricing tables and start again.

The format for importing pricing is:

```bash
npm run import-pricing -- <addon-key> <deployment-type> <start-date> <end-date> <csv-file>
```

Typically, the app will download all current pricing, and this script is used to import data for the prior pricing
period. If you are only importing one historical pricing period, you would typically specify the date range in which
the prior pricing was valid. For example, if prices were changed on 2024-09-01, the old pricing would be active
until the day prior, so you would supply date arguments of "NONE 2024-08-31" (indicating that the old pricing
was valid from the end of time through 2024-08-31). If you are importing multiple old pricing periods, you may want
to use a defined start date instead of NONE.

For example:
```bash
npm run import-pricing -- com.atlassian.confluence.plugins.confluence-questions server NONE 2024-12-31 pricing_for_20240331_to_20241231.csv
```

Parameters:
- `addon-key`: The key of the addon
- `deployment-type`: One of 'server', 'datacenter', or 'cloud'
- `start-date`: The start date for the pricing (YYYY-MM-DD). Use 'NONE' for indefinite past start date.
- `end-date`: Optional end date for the pricing (YYYY-MM-DD). Use 'NONE' for indefinite future end date.
- `csv-file`: Path to the CSV file containing the pricing data

The CSV file should have two columns:
- `userTier`: The number of users for this tier
- `cost`: The cost for this tier. For cloud deployments, this is the aggregate value of
the tier at the indicated level and not the per-user cost, and it represents the annual
value. (This number can be easily calculated for current pricing by visiting the Marketplace page
for your app, selecting the "Annual" billing period, and then filling in the user tier value.)


## Reseller Discount Management

The system supports managing resellers with different expected discount amounts. When a
reseller is added, the system will be able to automatically accept the transaction
if the sale price matches the expected discount amount.

Each reseller has:
- A name
- A match mode (exact or substring)
- A discount amount

### Adding a Reseller

To add a new reseller, use the `add-reseller` script:

```bash
npm run add-reseller <name> <matchMode> <discountAmountAsFraction>
```

Example:
```bash
npm run add-reseller "Xyz Reseller" substring 0.10
```

Parameters:
- `name`: The reseller name (use quotes if it contains spaces)
- `matchMode`: Either "exact" or "substring". "exact" must match the full
reseller name, while "substring" will match any portion of the reseller name
- `discountAmountAsFraction`: The discount amount as a fraction (for example, 0.10 is
a 10% discount)

## Transaction Adjustment Management

The system allows for manual adjustments to transactions, such as applying a discount or adding notes.

### Adding a Transaction Adjustment

To add or update an adjustment for a specific transaction, use the `add-transaction-adjustment` script:

```bash
npm run add-transaction-adjustment <transactionId> <discountAmount> [notes]
```

Example:
```bash
npm run add-transaction-adjustment 74f075cb-7afc-445d-ba3b-cc5d874341fc 100.00 "Special discount for customer X"
```

Parameters:
- `transactionId`: The database ID (UUID) of the transaction to adjust.
- `discountAmount`: The dollar amount to apply as a discount. Positive numbers represent a discount off list price (and should still be positive for refund transactions). Negative numbers correspond to an Atlassian overpayment on a sale.
- `notes` (optional): Any notes to associate with this adjustment.

The script will find the specified transaction and create a new adjustment record.

## General Usage: Command Line Parameters

When run to pull new data, the application supports the following command line parameters.
By default, everything is performed:

```bash
# Fetch and validate everything (default)
npm start

# Only perform certain actions
npm start -- <flags>
```

Possible flags include:

* `--with-fetch-apps` - download a list of appkeys associated with Atlassian user account
* `--with-pricing` - fetch current pricing information for all apps
* `--with-transactions` - fetch transactions
* `--with-licenses` - fetch licenses
* `--validate-transactions` - audit list of transactions

If no parameters are specified, all actions will be performed. If any parameters are specified, only the explicitly
requested actions will be performed.

## Database Schema

The application uses the following database schema:

- `Transaction`: Stores current transaction data
- `TransactionVersion`: Stores historical versions of transactions. This is maintained as a linked list of
prior transactions, with the fields changed in this version indicated by the JsonPaths in the "diff" column.
- `License`: Stores current license data
- `LicenseVersion`: Stores historical versions of licenses. The encoding is the same as for transactions.
- `Addon`: Stores a list of addon keys to track
- `Pricing`: Stores pricing records with date ranges
- `PricingInfo`: Stores pricing tiers for each pricing record
- `IgnoredField`: Stores a list of fields that should be ignored when tracking changes to transactions and licenses

Data downloaded from transactions and licenses is stored as JSON blobs in the `data` column of the
`Transaction`/`TransactionVersion` and `License`/`LicenseVersion` tables. This data can be viewed in
Postgres using queries such as the following, as an example for viewing current transaction data:

```
SELECT entitlement_id,
data->'purchaseDetails'->>'saleDate' AS sale_date,
data->'purchaseDetails'->>'vendorAmount' AS vendor_price,
jsonb_pretty(data) as data
FROM transaction
ORDER BY data->'purchaseDetails'->>'saleDate' DESC, created_at
LIMIT 5;
```