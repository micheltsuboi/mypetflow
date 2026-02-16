# Pet Registration and Login Flow Updates

## Summary
Updated the application to prioritize User/Tutor registration and unify the login experience, as requested.

### Key Changes

1.  **Landing Page (`/`)**:
    - Replaced the generic navigation cards with a prominent **Registration Form** for new Tutors.
    - Added "Login do Tutor", "Login do Pet", and "Login Staff/Owner" links below the form, all redirecting to the unified `/login` page.
    - Restored a discreet "Admin Master" link in the footer.

2.  **Registration Flow**:
    - Created `RegisterForm` component (`src/components/modules/RegisterForm.tsx`).
    - Implemented `registerClient` server action (`src/app/actions/auth.ts`) to handle user creation, profile setup (role='customer'), and customer record creation automatically.

3.  **Tutor Dashboard**:
    - Added a **"Cadastrar Pet"** button to the Quick Actions area.
    - Implemented `PetRegistrationModal` (`src/components/modules/PetRegistrationModal.tsx`) for tutors to register their pets.
    - Implemented `createPetByTutor` server action (`src/app/actions/pet.ts`) to allow secure pet creation for the logged-in user without edit/delete permissions.
    - Ensures Tutors can populate their own data but not modify it afterwards, adhering to the "create only" rule.

4.  **Security & Permissions**:
    - `registerClient` uses admin privileges to ensure proper initial setup of the customer account.
    - `createPetByTutor` verifies the user is a `customer` and forces the `customer_id` to match their own record.

### Files Created/Modified
- `src/app/page.tsx`: Updated landing page layout.
- `src/app/page.module.css`: Added styles for the registration card.
- `src/app/actions/auth.ts`: New auth action for client registration.
- `src/app/actions/pet.ts`: Added `createPetByTutor`.
- `src/components/modules/RegisterForm.tsx`: New component.
- `src/components/modules/PetRegistrationModal.tsx`: New component.
- `src/components/modules/PetRegistrationModal.module.css`: Styles for the modal.
- `src/app/(dashboard)/tutor/page.tsx`: Integrated the modal.

### Next Steps
- Verify the email confirmation flow (currently auto-confirmed for immediate access).
- Test the "Login do Pet" flow (currently unified with Tutor login).
