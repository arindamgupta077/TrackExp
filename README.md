# Daily Expense Tracker

A beautiful and intuitive expense tracking application built with React, TypeScript, and Supabase.

## Features

- **User Authentication**: Secure sign-up and sign-in with email/password
- **Expense Management**: Add, view, and delete expense entries
- **Profile Management**: Update profile information and upload profile photos
- **Analytics Dashboard**: View expense statistics and trends
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Instant synchronization with Supabase database

### Recent Updates

- ✅ **Delete Expense Entries**: Users can now remove expense entries with confirmation dialog
- ✅ **Profile Photo Upload**: Enhanced profile photo upload with validation and error handling
- ✅ **Profile Photo Removal**: Users can remove their profile photos
- ✅ **Fixed File Upload Bug**: Resolved issue where "Change Photo" button wasn't working
- ✅ **Improved UI/UX**: Better user experience with confirmation dialogs and loading states
- ✅ **Light & Dark Theme Toggle**: Users can switch between dark and light modes from Profile → Preferences, with preferences saved locally

## Project info

**URL**: https://www.trackexp.in/

## How can I edit this code?

There are several ways of editing your application.


**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Theme Controls

- The active theme is stored in `localStorage` using the `trackexp_theme` key (`dark` or `light`).
- Theme styles are driven by CSS variables defined in `src/theme.css`; global overrides live in `src/index.css`.
- Apply or persist theme changes via the helpers in `src/utils/themeManager.ts` and the context provided in `src/contexts/ThemeContext.tsx`.

## Android APK build (Capacitor)

Follow these steps to generate an installable Android package from the web build:

1. **Install dependencies**: `npm install` (or `bun install`) to pull in the new Capacitor packages.
2. **Create the Android project (first time only)**: `npm run android:setup`. This scaffolds `android/` using Capacitor.
3. **Build the web assets and sync to Android**: `npm run build:android`. This runs the Vite production build and copies the output to the Android project via Capacitor.
4. **Open Android Studio**: `npm run android:open`, then let Gradle finish syncing. Ensure `local.properties` points to a valid Android SDK (`sdk.dir=...`).
5. **Produce an APK**: In Android Studio choose `Build > Build Bundle(s) / APK(s) > Build APK(s)`. The signed/unsigned APK will be available under `android/app/build/outputs/apk/`.

For release builds, configure signing inside Android Studio (`Build > Generate Signed Bundle / APK...`) and adjust the version information in `android/app/src/main/AndroidManifest.xml` as needed.


Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
