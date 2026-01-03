# Dams PLUS (ADT)

**Dams PLUS** is a comprehensive web-based management system built with Node.js, Express, and PostgreSQL. It provides robust features for managing organizational data, including employees, departments, tasks, and system configurations.

## 🚀 Features

### Core Management
- **Dashboard**: Overview of key metrics and statistics.
- **Employee Management**: CRUD operations for employee records, search, and pagination.
- **Department Management**: Organize and manage company departments.
- **Task Management**: Assign and track tasks with status updates (Pending, Running, Completed).

### System Administration
- **Menu Management**: Configure dynamic sidebar menus.
- **Role & Permission Management**: Define user roles and assign granular permissions.
- **API Endpoint Management**: Manage and document internal API endpoints.
- **API Keys**: Generate and manage API keys for external access.
- **System Logs**: View client and server logs for debugging.

### Technical Features
- **Authentication**: Secure login and session management.
- **Hierarchical Views**: Tree view visualization for organizational structure.
- **Image Uploads**: Support for uploading and managing images.
- **Responsive Design**: Built with Tailwind CSS for a seamless mobile and desktop experience.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS (CDN), FontAwesome
- **Tools**: Flatpickr (Date handling), EasyMDE (Markdown editing)

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/kingntop/ADT.git
    cd ADT
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory:
    ```env
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=postgres
    SESSION_SECRET=your_secret_key
    ```

4.  **Database Setup**
    Run the initialization SQL scripts located in the `sql/` directory to set up tables and default data.

5.  **Run the Server**
    ```bash
    node server.js
    ```
    Access the application at `http://localhost:3000`.

## 📂 Project Structure

```
ADT/
├── middleware/       # Express middleware (Auth, Logging, etc.)
├── public/           # Static assets (CSS, JS, Images)
├── routes/           # API and View routes
├── sql/              # Database schema and seed scripts
├── utils/            # Utility functions (Logger, DB helpers)
├── views/            # HTML templates
├── server.js         # Entry point
└── package.json      # Dependencies
```

## 📝 License

This project is open-source and available under the ISC License.

