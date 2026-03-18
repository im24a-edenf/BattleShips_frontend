# React Frontend Template

This is a starter template for learning web development with a React frontend and a Spring Boot backend. It includes basic authentication, routing, and role-based access control.

## 🚀 How to Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run the Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

> **Note:** Make sure your Spring Boot backend is running at `http://localhost:8080` for the API calls to work.

## 📂 Project Structure & Key Files

Here is where the magic happens:

### 1. API Configuration (`src/api/axios.ts`)
This file sets up **Axios**, the library used to send requests to your backend. It defines the `baseURL` and ensures cookies are sent with every request.

### 2. Authentication State (`src/AuthContext.tsx`)
This is the "brain" of the app's security. It tracks if a user is logged in, who they are, and provides `login` and `logout` functions to the rest of the app.

### 3. Routing & Security (`src/App.tsx`)
This file defines the different pages (routes) of your app. It also uses "Protected Routes" to ensure only logged-in users can see the Dashboard.

### 4. Components (`src/components/`)
*   **`Login.tsx` & `Register.tsx`**: Handle user input and communicate with the backend to authenticate.
*   **`Dashboard.tsx`**: A private page that shows how to fetch data and handle different user roles (e.g., User vs. Admin).

## 💡 How to add a new page?

1. Create a new component in `src/components/`.
2. Open `src/App.tsx`.
3. Import your component and add a new `<Route>` inside the `<Routes>` block.
