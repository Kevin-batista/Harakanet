#!/usr/bin/env bash
set -euo pipefail

mkdir -p \
  .github/workflows \
  .vscode \
  apps/web/public \
  apps/web/src/components/layout \
  apps/web/src/components/bundles \
  apps/web/src/components/checkout \
  apps/web/src/components/order \
  apps/web/src/components/offline \
  apps/web/src/components/ui \
  apps/web/src/features/bundles \
  apps/web/src/features/checkout \
  apps/web/src/features/order \
  apps/web/src/features/offline \
  apps/web/src/services \
  apps/web/src/store \
  apps/web/src/styles \
  apps/web/src/pages \
  apps/admin/src/components \
  apps/admin/src/layouts \
  apps/admin/src/auth \
  apps/admin/src/pages \
  apps/admin/src/features/orders \
  apps/admin/src/features/bundles \
  apps/admin/src/features/float \
  apps/admin/src/features/reports \
  apps/admin/src/services \
  apps/admin/src/styles \
  apps/api/src/config \
  apps/api/src/routes \
  apps/api/src/controllers \
  apps/api/src/controllers/admin \
  apps/api/src/services \
  apps/api/src/repositories \
  apps/api/src/integrations/daraja \
  apps/api/src/middleware \
  apps/api/src/jobs \
  apps/api/src/utils \
  apps/api/tests \
  apps/bot/ussd \
  apps/bot/device \
  apps/bot/tests \
  packages/shared/src/constants \
  packages/shared/src/validators \
  packages/shared/src/types \
  packages/shared/src \
  db/migrations \
  db/seeds \
  infra/nginx \
  infra \
  docs \
  .

files=(
  ".env.example"
  ".gitignore"
  "README.md"
  "package.json"
  "docker-compose.yml"

  "packages/shared/package.json"
  "packages/shared/src/index.js"
  "packages/shared/src/constants/orderStatus.js"
  "packages/shared/src/constants/roles.js"
  "packages/shared/src/validators/phone.js"
  "packages/shared/src/validators/order.js"
  "packages/shared/src/types/api.js"

  "apps/web/package.json"
  "apps/web/vite.config.js"
  "apps/web/index.html"
  "apps/web/public/favicon.ico"
  "apps/web/public/site.webmanifest"
  "apps/web/public/apple-touch-icon.png"
  "apps/web/public/android-chrome-192x192.png"
  "apps/web/public/android-chrome-512x512.png"
  "apps/web/public/maskable-icon-512x512.png"
  "apps/web/public/bundles.json"
  "apps/web/src/main.jsx"
  "apps/web/src/App.jsx"
  "apps/web/src/routes.jsx"
  "apps/web/src/pages/HomePage.jsx"
  "apps/web/src/pages/CheckoutPage.jsx"
  "apps/web/src/pages/PaymentWaitingPage.jsx"
  "apps/web/src/pages/OrderStatusPage.jsx"
  "apps/web/src/pages/OfflinePayPage.jsx"
  "apps/web/src/pages/TrackOrderPage.jsx"
  "apps/web/src/pages/HelpPage.jsx"
  "apps/web/src/pages/TermsPage.jsx"
  "apps/web/src/pages/PrivacyPage.jsx"
  "apps/web/src/pages/NotFoundPage.jsx"
  "apps/web/src/components/layout/Header.jsx"
  "apps/web/src/components/layout/Footer.jsx"
  "apps/web/src/components/layout/PageShell.jsx"
  "apps/web/src/components/layout/InstallPrompt.jsx"
  "apps/web/src/components/layout/OfflineBanner.jsx"
  "apps/web/src/components/bundles/BundleCard.jsx"
  "apps/web/src/components/bundles/BundleGrid.jsx"
  "apps/web/src/components/bundles/CategoryTabs.jsx"
  "apps/web/src/components/bundles/PriceTag.jsx"
  "apps/web/src/components/checkout/PhoneInput.jsx"
  "apps/web/src/components/checkout/NumberConfirmModal.jsx"
  "apps/web/src/components/checkout/PayButton.jsx"
  "apps/web/src/components/checkout/PaymentSummary.jsx"
  "apps/web/src/components/order/StatusTimeline.jsx"
  "apps/web/src/components/order/ReceiptCard.jsx"
  "apps/web/src/components/order/CountdownTimer.jsx"
  "apps/web/src/components/order/RetryPanel.jsx"
  "apps/web/src/components/offline/MenuPaySteps.jsx"
  "apps/web/src/components/offline/CopyTillButton.jsx"
  "apps/web/src/components/ui/Button.jsx"
  "apps/web/src/components/ui/Input.jsx"
  "apps/web/src/components/ui/Spinner.jsx"
  "apps/web/src/components/ui/Toast.jsx"
  "apps/web/src/components/ui/Modal.jsx"
  "apps/web/src/components/ui/ErrorState.jsx"
  "apps/web/src/components/ui/EmptyState.jsx"
  "apps/web/src/features/bundles/useBundles.js"
  "apps/web/src/features/checkout/useCheckout.js"
  "apps/web/src/features/order/useOrderPolling.js"
  "apps/web/src/features/offline/useConnectivity.js"
  "apps/web/src/services/apiClient.js"
  "apps/web/src/services/ordersApi.js"
  "apps/web/src/services/bundlesApi.js"
  "apps/web/src/store/orderStore.js"
  "apps/web/src/styles/tokens.css"
  "apps/web/src/styles/global.css"

  "apps/admin/package.json"
  "apps/admin/vite.config.js"
  "apps/admin/index.html"
  "apps/admin/src/main.jsx"
  "apps/admin/src/App.jsx"
  "apps/admin/src/routes.jsx"
  "apps/admin/src/layouts/AdminLayout.jsx"
  "apps/admin/src/auth/AuthProvider.jsx"
  "apps/admin/src/auth/ProtectedRoute.jsx"
  "apps/admin/src/auth/useAuth.js"
  "apps/admin/src/pages/LoginPage.jsx"
  "apps/admin/src/pages/DashboardPage.jsx"
  "apps/admin/src/pages/OrdersPage.jsx"
  "apps/admin/src/pages/OrderDetailPage.jsx"
  "apps/admin/src/pages/ManualQueuePage.jsx"
  "apps/admin/src/pages/PaymentsPage.jsx"
  "apps/admin/src/pages/RefundsPage.jsx"
  "apps/admin/src/pages/BundlesPage.jsx"
  "apps/admin/src/pages/FloatBotPage.jsx"
  "apps/admin/src/pages/ReconciliationPage.jsx"
  "apps/admin/src/pages/ReportsPage.jsx"
  "apps/admin/src/pages/CustomersPage.jsx"
  "apps/admin/src/pages/LogsPage.jsx"
  "apps/admin/src/pages/UsersPage.jsx"
  "apps/admin/src/pages/SettingsPage.jsx"
  "apps/admin/src/pages/NotFoundPage.jsx"
  "apps/admin/src/components/Sidebar.jsx"
  "apps/admin/src/components/Topbar.jsx"
  "apps/admin/src/components/StatCard.jsx"
  "apps/admin/src/components/SalesChart.jsx"
  "apps/admin/src/components/OrdersTable.jsx"
  "apps/admin/src/components/FilterBar.jsx"
  "apps/admin/src/components/StatusBadge.jsx"
  "apps/admin/src/components/EventTimeline.jsx"
  "apps/admin/src/components/BotHealthCard.jsx"
  "apps/admin/src/components/FloatGauge.jsx"
  "apps/admin/src/components/ConfirmDialog.jsx"
  "apps/admin/src/components/RefundForm.jsx"
  "apps/admin/src/components/BundleForm.jsx"
  "apps/admin/src/components/DateRangePicker.jsx"
  "apps/admin/src/components/ExportButton.jsx"
  "apps/admin/src/features/orders/useOrders.js"
  "apps/admin/src/features/bundles/useBundlesAdmin.js"
  "apps/admin/src/features/float/useFloat.js"
  "apps/admin/src/features/reports/useReports.js"
  "apps/admin/src/services/adminApi.js"
  "apps/admin/src/styles/tokens.css"
  "apps/admin/src/styles/global.css"

  "apps/api/package.json"
  "apps/api/src/server.js"
  "apps/api/src/app.js"
  "apps/api/src/config/env.js"
  "apps/api/src/config/db.js"
  "apps/api/src/routes/index.js"
  "apps/api/src/routes/public.routes.js"
  "apps/api/src/routes/mpesa.routes.js"
  "apps/api/src/routes/bot.routes.js"
  "apps/api/src/routes/admin.routes.js"
  "apps/api/src/controllers/bundles.controller.js"
  "apps/api/src/controllers/orders.controller.js"
  "apps/api/src/controllers/mpesa.controller.js"
  "apps/api/src/controllers/bot.controller.js"
  "apps/api/src/controllers/admin/auth.controller.js"
  "apps/api/src/controllers/admin/orders.controller.js"
  "apps/api/src/controllers/admin/refunds.controller.js"
  "apps/api/src/controllers/admin/bundles.controller.js"
  "apps/api/src/controllers/admin/float.controller.js"
  "apps/api/src/controllers/admin/reports.controller.js"
  "apps/api/src/controllers/admin/reconciliation.controller.js"
  "apps/api/src/controllers/admin/settings.controller.js"
  "apps/api/src/controllers/admin/users.controller.js"
  "apps/api/src/services/order.service.js"
  "apps/api/src/services/payment.service.js"
  "apps/api/src/services/refund.service.js"
  "apps/api/src/services/bot.service.js"
  "apps/api/src/services/float.service.js"
  "apps/api/src/services/report.service.js"
  "apps/api/src/services/reconciliation.service.js"
  "apps/api/src/services/auth.service.js"
  "apps/api/src/repositories/orders.repo.js"
  "apps/api/src/repositories/payments.repo.js"
  "apps/api/src/repositories/bundles.repo.js"
  "apps/api/src/repositories/refunds.repo.js"
  "apps/api/src/repositories/events.repo.js"
  "apps/api/src/repositories/users.repo.js"
  "apps/api/src/repositories/settings.repo.js"
  "apps/api/src/integrations/daraja/auth.js"
  "apps/api/src/integrations/daraja/stkPush.js"
  "apps/api/src/integrations/daraja/parseCallback.js"
  "apps/api/src/integrations/daraja/refund.js"
  "apps/api/src/middleware/requireAdmin.js"
  "apps/api/src/middleware/requireBot.js"
  "apps/api/src/middleware/validate.js"
  "apps/api/src/middleware/rateLimit.js"
  "apps/api/src/middleware/errorHandler.js"
  "apps/api/src/jobs/expireOrders.js"
  "apps/api/src/jobs/autoRefund.js"
  "apps/api/src/jobs/reconcile.js"
  "apps/api/src/jobs/botWatchdog.js"
  "apps/api/src/utils/logger.js"
  "apps/api/src/utils/phone.js"
  "apps/api/tests/orders.test.js"
  "apps/api/tests/callback.test.js"
  "apps/api/tests/bot.test.js"

  "apps/bot/requirements.txt"
  "apps/bot/config.py"
  "apps/bot/worker.py"
  "apps/bot/queue_client.py"
  "apps/bot/alerts.py"
  "apps/bot/ussd/__init__.py"
  "apps/bot/ussd/runner.py"
  "apps/bot/ussd/data_bundles.py"
  "apps/bot/ussd/minutes_bundles.py"
  "apps/bot/ussd/sms_bundles.py"
  "apps/bot/device/__init__.py"
  "apps/bot/device/adb.py"
  "apps/bot/device/sms_reader.py"
  "apps/bot/device/screen.py"
  "apps/bot/tests/test_runner.py"

  "db/migrations/001_bundles.sql"
  "db/migrations/002_orders.sql"
  "db/migrations/003_payments.sql"
  "db/migrations/004_refunds.sql"
  "db/migrations/005_events_and_callbacks.sql"
  "db/migrations/006_operations.sql"
  "db/migrations/007_admin_and_settings.sql"
  "db/seeds/bundles.sql"
  "db/seeds/admin_user.sql"

  "infra/nginx/web.conf"
  "infra/nginx/admin.conf"
  "infra/nginx/api.conf"
  "infra/deploy.sh"

  "docs/engineering-guide.html"
  "docs/architecture.md"
  "docs/runbook.md"
  "docs/bot-clearance.md"
)

for file in "${files[@]}"; do
  mkdir -p "$(dirname "$file")"
  if [ ! -e "$file" ]; then
    : > "$file"
  fi
done

echo "Manifest scaffold complete."
