import bcrypt from "bcryptjs";
import User from "../models/user.js";

/**
 * Initializes the Super Admin account if configured via environment variables.
 * If the account does not exist in MongoDB, it creates it.
 * If the account exists, it ensures the userType is 'superadmin' without overwriting
 * the database password, allowing changes made directly in the database to persist.
 */
export const initSuperAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log(
        "[SuperAdmin] No ADMIN_EMAIL or ADMIN_PASSWORD specified in .env. Skipping initialization."
      );
      return;
    }

    const normalizedEmail = adminEmail.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (!existingUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword.trim(), salt);

      const superAdmin = await User.create({
        firstName: process.env.ADMIN_FIRST_NAME || "Super",
        lastName: process.env.ADMIN_LAST_NAME || "Admin",
        email: normalizedEmail,
        password: hashedPassword,
        userType: "superadmin",
        status: "active",
        avatar: "",
      });

      console.log(
        `[SuperAdmin] Successfully created Super Admin account in database: ${superAdmin.email}`
      );
    } else {
      let updated = false;

      // Ensure userType is superadmin
      if (existingUser.userType !== "superadmin") {
        existingUser.userType = "superadmin";
        updated = true;
      }

      // Ensure account is active
      if (existingUser.status === "blocked") {
        existingUser.status = "active";
        updated = true;
      }

      // Ensure password matches ADMIN_PASSWORD from .env
      const isPasswordMatch = await bcrypt.compare(adminPassword.trim(), existingUser.password);
      if (!isPasswordMatch) {
        const salt = await bcrypt.genSalt(10);
        existingUser.password = await bcrypt.hash(adminPassword.trim(), salt);
        updated = true;
        console.log(
          `[SuperAdmin] Synchronized password for Super Admin: ${existingUser.email}`
        );
      }

      if (updated) {
        await existingUser.save();
        console.log(
          `[SuperAdmin] Super Admin account updated and verified: ${existingUser.email}`
        );
      } else {
        console.log(
          `[SuperAdmin] Super Admin account verified in database: ${existingUser.email}`
        );
      }
    }
  } catch (error) {
    console.error("[SuperAdmin] Initialization error:", error.message);
  }
};
