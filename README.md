# Cenote Marketplace Auditor

An application that displays and audits transactions and licenses from the Atlassian Marketplace API.

This application is ©️ 2025 by Cenote Labs, Inc. All rights reserved. The application is licensed for your use under the standard terms of the Gnu Affero GPL (see LICENSE.txt).

PRs are welcome.

# Features

- Automatically configures itself: given Atlassian API credentials, it automatically
downloads a list of your apps, your apps' pricing, all transactions and all licenses
- Validates expected versus actual pricing for all transactions (since 2024)
- Provides a facility for marking transactions as reconciled or unreconciled,
including the automatic reconciliation of transactions that have expected pricing
- Tracks version history of all transactions and licenses
- Provides easy visualization of changes made to historical versions of transactions and licenses
- Enhances the Marketplace view of current licenses and transactions: sandbox licenses are clearly,
identified, evaluation licenses shows seat size whenever possible, grace period is visible, maintenance duration
is surfaced, etc.)
- Optional automatic polling of the Marketplace API every 'x' hours to automatically capture new data
- Optional communication to Slack to post messages when new sales and evaluations are
received

# Caveats

- **This application does not include any authentication. DO NOT RUN THIS CONTAINER ON THE OPEN INTERNET.**
However, the default Docker configuration runs the container with local-only ports. This means that users
on other machines cannot access it and it should be relatively safe. If you change the configuration
yourself to open these ports, it must be placed behind some other server with protection.
- The pricing calculations are designed for Cloud and Data Center licenses. Pricing
for Server licenses is not supported.
- If you have previously changed the pricing for your app, pricing for those transactions cannot be correctly computed until you import prior period pricing into the app. Data entry for
prior period pricing is not currently supported in the UI, although the functionality exists via scripts (see below). Prior period pricing must be imported even in order to correctly price certain
*current* sales: if a current license is being upgraded with a maintenance period that overlaps a license that
was sold during the previous pricing period, the previous pricing is still required to  calculate the upgrade value.
- Support for pricing apps which use Atlassian's automatic reseller discount option is implemented, but it has not been tested
- Support for regular-use promo codes is implemented on a reseller-by-reseller basis, but only via scripts (see below)
- The transaction reconciliation feature is a work-in-progress.
- The pricing calculated by this app is not guaranteed. Even though the app attempts to highlight pricing
discrepancies, it remains your responsibility to validate the app's calculations and to determine how
to correctly calculate the price for your sales.
- Pricing is known to work correctly for Confluence apps. Your mileage may vary for other host application types.

# Prerequisites

To use this app, you need:

- Docker and Docker Compose
- Atlassian API token for an Atlassian account that has access to the Marketplace API. This user's permissions
(configured on the Marketplace "Team" tab) must include at least: "View sales reports" and "View all other reports".
- Authentication requires a new or existing API token created via: https://id.atlassian.com/manage-profile/security/api-tokens
- Atlassian vendor ID. If you are not sure of your vendor ID, visit the Marketplace dashboard for your
vendor account, and find it in the URL as: "https://marketplace.atlassian.com/manage/vendors/#####/addons"
- At least one Paid-by-Atlassian app that has Cloud or Data Center hosting.

# Setup

1. Clone the repository

2. Start the containers:
   ```bash
   docker-compose up -d
   ```

3. Access the application at http://localhost:3000/

4. Visit the Configuration tab to enter your Atlassian account credentials

5. Optionally, also use the Configuration tab to enable automatic polling of
new Marketplace data every 'x' hours to fetch new transactions and licenses.

6. Visit the Tasks tab and click "Start All Tasks" to perform the initial
fetch of apps, pricing, transactions and licenses.

7. When the tasks have finished running, visit the Transactions and Licenses
tabs to visualize transaction and license data.

8. To configure the Slack integration, see below.

# Usage

## Transaction View

To find transactions, you can enter text into the search field, use certain column
headers to sort, or use the reconciliation filter dropdown.

To view a transaction in detail, click on the transaction row to display a dialog
with the detailed JSON transaction data. If more than one version of the transaction
exists, after clicking on the transaction row, click "Show All Versions" in the header to see a list of prior versions, as well as the
fields that were mutated and the date of the change. To view the complete historical version of the transaction,
click on the row in the version list. This view will show a delta of the specific field values modified.

To reconcile or unreconcile a transaction, from the main transaction list,
click the grey/green dot in the right hand column. The "i" icon
shows reconciliation information, including expected pricing and any potential discrepancies.

## License View

The license view is similar to the transaction view, including the visibility into
versioning of licenses. There is currently no reconciliation feature for licenses.

## Configuring the Slack Integration

To configure the Slack integration, visit the Slack API page to create a new app at:

https://api.slack.com/apps

Next:

- Click "Create New App"
- Select "From scratch"
  -  App Name: Marketplace Auditor
  -  Workspace: choose your site
- In the sidebar, select “OAuth & Permissions”
  - Scroll down to “Scopes” and “Bot Token Scopes”
  - Click “Add an OAuth scope”
  - Add the following scopes:
```
channels:read
chat:write
chat:write.customize
chat:write.public
groups:read
im:read
mpim:read
incoming-webhook
```
- In the sidebar, click “Install app”
- Install to your site
- Copy the "Bot User OAuth Token"
- Next, go to the Marketplace Auditor app, visit the Configuration tab, and enable "Post Messages to Slack"
- Paste the OAuth Token into the "Slack Bot Token" field
- Enter the channel names where you would like to post notifications of new sales, new evaluations, or exceptions.
- Leaving a channel name blank means that those types of events will not be posted to Slack.
- The exceptions channel is not currently implemented.

## Command Line Tools

Certain tasks can only be performed via command-line tools. While the eventual goal is to
migrate everything to the UI, this is not complete.

To use the command line scripts, you must first populate a file called `.env` in the current directory that looks like this:

```
DB_HOST=localhost
DB_PORT=5431
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=marketplace_auditor
```

You may also need to install various npm modules locally (`npm install`) before you can use the scripts.

### Script for Managing Apps

Although the app will automatically add a list of all known apps to be tracked, to manually add a new app to be tracked, the following can be run from the
command line:

```bash
npm run add-addon -- <addon-key>
```

For example:
```bash
npm run add-addon -- com.atlassian.confluence.plugins.confluence-questions
```

### Script for Managing Ignored Fields

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
- `purchaseDetauls.parentProductName`
- `purchaseDetails.changeInParentProductEdition`
- `purchaseDetails.oldParentProductEdition`

To add a new field to the ignored list, add its JSONPath as follows:

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

### Scripts for Managing Pricing Data

If you have previously updated the pricing for your app, you must provide the prior pricing
details so that it can calculate the correct pricing for app sales in that period, as well
as any current-time upgrades to apps that were originally licensed during the prior pricing period.

Before adding prior-period pricing data, you need to be sure to have run the app and run the
"Fetch App Pricing" task from the UI.

#### Prepare For Prior Pricing Periods by Exporting Pricing Template

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

#### Importing Prior-Period Pricing Data

After editing the .CSV file to set the prior period pricing, run the following command to import it. You must
provide the start date and end date for when this pricing was effective. This will export a CSV template using
the tiers defined for the current pricing, as well as copies of the current actual pricing. Once you import the pricing data, you will need to rerun the validation task
in order to see its impact.

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
npm run import-pricing -- com.atlassian.confluence.plugins.confluence-questions cloud NONE 2024-12-31 pricing_for_20240331_to_20241231.csv
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


### Scripts for Reseller Discount Management

The system supports managing resellers with different expected discount amounts,
which typically correspond to promo codes handed out for regular use by that
reseller. When a reseller is added, the system will be able to automatically
accept the transaction if the sale price matches the expected discount amount.

Each reseller has:
- A name
- A match mode (exact or substring)
- A discount amount

#### Adding a Reseller

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

### Scripts for Transaction Adjustment Management

The system allows for manual adjustments to transactions, such as applying a discount or adding notes, which will allow that transaction to be automatically
reconciled.

#### Adding a Transaction Adjustment

To add or update an adjustment for a specific transaction, use the `add-transaction-adjustment` script:

```bash
npm run add-transaction-adjustment <transactionId> <discountAmount> [notes]
```

Example:
```bash
npm run add-transaction-adjustment 74f075cb-7afc-445d-ba3b-cc5d874341fc 100.00 "Special discount for customer X"
```

Parameters:
- `transactionId`: The database ID (UUID) of the transaction to adjust. This is
currently only available from the database, but it may eventually be exposed in the UI.
- `discountAmount`: The dollar amount to apply as a discount. Positive numbers represent a discount off list price (and should still be positive for refund transactions). Negative numbers correspond to an Atlassian overpayment on a sale.
- `notes` (optional): Any notes to associate with this adjustment.

The script will find the specified transaction and create a new adjustment record.
