
# Inventory Manager Pro

A full-stack inventory management system built with the MERN stack. Features role-based access control, real-time activity tracking, and email notifications.



---

## Features

- **JWT Authentication** — secure login and registration
- **Role-Based Access Control** — Superadmin, Admin, and User roles
- **Materials Management** — add, edit, delete inventory items with location and category assignment
- **Locations Management** — create and manage storage locations
- **Categories Management** — organize materials by category
- **Subscriptions** — Stripe Checkout with Starter/Pro/Enterprise tiers, seat and material limits, and a read-only lockout when a subscription lapses
- **User Management** — admins can add/remove users, superadmin can assign roles, send password reset links, and suspend accounts
- **Announcements** — admins can post pinned announcements visible to all users
- **Activity Feed** — real-time log of all actions on the dashboard
- **Email Notifications** — instant email alerts for all activity (logins, material changes, user actions)
- **Low Inventory Alerts** — automatic email when item quantity drops below 5
- **Mobile Responsive** — collapsible sidebar with hamburger menu

---

## Tech Stack

**Frontend**
- React.js
- React Router DOM
- Axios
- Context API for state management

**Backend**
- Node.js
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens (JWT)
- Nodemailer (email notifications)

**Infrastructure**
- MongoDB Atlas (database)
- Render (backend hosting)
- Render Static Sites (frontend hosting)
- GitHub (version control)

---

## Getting Started

### Prerequisites
- Node.js
- MongoDB Atlas account
- Gmail account with App Password

### Installation

1. Clone the repo
```bash
git clone https://github.com/stephenwaldrip/inventory_manager_pro.git
cd inventory_manager_pro
```

2. Install backend dependencies
```bash
cd server
npm install
```

3. Install frontend dependencies
```bash
cd ../client
npm install
```

4. Create a `.env` file in the `server` folder
```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key
# Sender address. Must be a domain verified in the Resend dashboard.
# If unset, falls back to Resend's sandbox sender, which only
# delivers to the Resend account owner.
MAIL_FROM=Inventory Manager Pro <no-reply@yourdomain.com>
# Stripe. Use a restricted key (rk_) rather than a secret key (sk_).
STRIPE_SECRET_KEY=rk_test_your_restricted_key
# From `stripe listen` locally, or the endpoint secret in the Dashboard.
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
# Price IDs, one per tier and billing interval.
STRIPE_PRICE_STARTER_MONTH=price_...
STRIPE_PRICE_STARTER_YEAR=price_...
STRIPE_PRICE_PRO_MONTH=price_...
STRIPE_PRICE_PRO_YEAR=price_...
STRIPE_PRICE_ENTERPRISE_MONTH=price_...
STRIPE_PRICE_ENTERPRISE_YEAR=price_...
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
PORT=5000
```

5. Run the backend
```bash
cd server
npm start
```

6. Run the frontend
```bash
cd client
npm start
```

---

## Role Permissions

| Feature | Superadmin | Admin | User |
|---|---|---|---|
| View all pages | Yes | Yes | Yes |
| Manage inventory | Yes | Yes | No |
| Add/delete users | Yes | Yes | No |
| Edit users | Yes | No | No |
| Reset passwords | Yes | No | No |
| Suspend accounts | Yes | No | No |
| Assign roles | Yes | No | No |
| Post announcements | Yes | Yes | No |

---

## Screenshots

*Coming soon*

---

## Author

**Stephen Waldrip**
- GitHub: [@stephenwaldrip](https://github.com/stephenwaldrip)
- LinkedIn: [linkedin.com/in/stephen-waldrip](https://linkedin.com/in/stephen-waldrip)

---

## License

MIT
