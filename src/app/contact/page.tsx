import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactFormSection } from "@/components/HomeInteractive";

export default async function ContactPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar user={user} />
      <div className="pt-28 pb-8 px-4 sm:px-6 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold">Contact Us</h1>
        <p className="mt-3 text-[#b0b0b8] text-base">
          Reach our artist onboarding, label relations, or copyright support team.
        </p>
      </div>
      <ContactFormSection />
      <Footer />
    </div>
  );
}
