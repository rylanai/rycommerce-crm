"use client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

import { useState, useEffect, useRef, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const GOOGLE_PLACES_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY || "";

interface FormData {
  wants_to_sell: string;
  timeline: string;
  repairs: string;
  sell_reason: string;
  property_address: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

function getUtmParams() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_campaign: params.get("utm_campaign") || "",
    sub_id_1: params.get("sub_id_1") || "",
    sub_id_2: params.get("sub_id_2") || "",
    sub_id_3: params.get("sub_id_3") || "",
    sub_id_4: params.get("sub_id_4") || "",
    sub_id_5: params.get("sub_id_5") || "",
  };
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all cursor-pointer"
      style={{
        backgroundColor: selected ? "#3a9fc5" : "#4cb8e0",
        borderColor: selected ? "#3a9fc5" : "#4cb8e0",
        color: "white",
        fontWeight: 700,
        fontSize: "16px",
        marginBottom: "10px",
      }}
    >
      <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
        {selected && (
          <span className="w-2.5 h-2.5 rounded-full bg-white block" />
        )}
      </span>
      {label}
    </button>
  );
}

function NextButton({
  onClick,
  label = "Next",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-lg mt-4 text-white font-bold text-lg cursor-pointer"
      style={{ backgroundColor: "#4cb8e0" }}
    >
      {label}
    </button>
  );
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    wants_to_sell: "",
    timeline: "",
    repairs: "",
    sell_reason: "",
    property_address: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const initAutocomplete = useCallback(() => {
    if (!addressInputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(
      addressInputRef.current,
      { types: ["address"], componentRestrictions: { country: "us" } }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.formatted_address) {
        setFormData((prev) => ({
          ...prev,
          property_address: place.formatted_address!,
        }));
      }
    });
  }, []);

  useEffect(() => {
    if (step !== 5 || !GOOGLE_PLACES_KEY) return;

    if (window.google?.maps?.places) {
      initAutocomplete();
    } else {
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com"]'
      );
      if (existingScript) {
        existingScript.addEventListener("load", initAutocomplete);
      } else {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_KEY}&libraries=places`;
        script.async = true;
        script.onload = initAutocomplete;
        document.head.appendChild(script);
      }
    }

    return () => {
      // Clean up autocomplete when leaving step 5
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      // Remove the pac-container dropdown that Google Places leaves in the DOM
      document
        .querySelectorAll(".pac-container")
        .forEach((el) => el.remove());
    };
  }, [step, initAutocomplete]);

  const selectOption = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTimeout(() => setStep((s) => s + 1), 200);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const utmParams = getUtmParams();
      await fetch(`${API_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, ...utmParams }),
      });
      setSubmitted(true);
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "Lead");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#eaf4fb" }}
      >
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-lg w-full mx-4 text-center">
          <h1 className="text-3xl font-bold mb-4" style={{ color: "#021e80" }}>
            Thank You!
          </h1>
          <p className="text-lg text-gray-700">
            We&apos;ll be in touch shortly with your cash offer.
          </p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
              Do you want to sell your house for cash?
            </h2>
            {["Yes", "No"].map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={formData.wants_to_sell === opt}
                onClick={() => selectOption("wants_to_sell", opt)}
              />
            ))}
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
              How soon would you like to sell?
            </h2>
            {[
              "ASAP",
              "Within 30 Days",
              "Within 60 Days",
              "Within 90 Days",
              "No Timeline",
            ].map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={formData.timeline === opt}
                onClick={() => selectOption("timeline", opt)}
              />
            ))}
          </>
        );
      case 3:
        return (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
              What kind of repairs and maintenance does the house need?
            </h2>
            {[
              "Full Gut - Everything - $$$$",
              "Remodel - Kitchen, Bathrooms, Roof - $$$",
              "Cosmetic - Flooring, Paint - $$",
              "None - TV Commercial Ready - $",
            ].map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={formData.repairs === opt}
                onClick={() => selectOption("repairs", opt)}
              />
            ))}
          </>
        );
      case 4:
        return (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
              Why are you selling your house?
            </h2>
            {[
              "Foreclosure",
              "Emergency reasons",
              "Tired Landlord or Non-performing tenants",
              "Relocating",
              "Structural/Fire/Water damage",
              "Inheritance",
              "Divorce",
              "Sell without real estate agent",
            ].map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={formData.sell_reason === opt}
                onClick={() => selectOption("sell_reason", opt)}
              />
            ))}
          </>
        );
      case 5:
        return (
          <>
            <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
              Please Enter Your Property Address
            </h2>
            <p className="text-sm text-gray-500 text-center mb-4">
              type your address below, then select from the dropdown
            </p>
            <input
              ref={addressInputRef}
              type="text"
              placeholder="Enter your property address"
              value={formData.property_address}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  property_address: e.target.value,
                }))
              }
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-base text-gray-800"
            />
            <NextButton
              onClick={() => {
                if (formData.property_address) setStep(6);
              }}
            />
          </>
        );
      case 6:
        return (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
              What is your name?
            </h2>
            <input
              type="text"
              placeholder="First Name"
              autoComplete="off"
              value={formData.first_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, first_name: e.target.value }))
              }
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-base mb-3 text-gray-800"
            />
            <input
              type="text"
              placeholder="Last Name"
              autoComplete="off"
              value={formData.last_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, last_name: e.target.value }))
              }
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-base text-gray-800"
            />
            <NextButton
              onClick={() => {
                if (formData.first_name && formData.last_name) setStep(7);
              }}
            />
          </>
        );
      case 7:
        return (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
              What is your email address?
            </h2>
            <input
              type="email"
              placeholder="Email address"
              autoComplete="off"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-base text-gray-800"
            />
            <NextButton
              onClick={() => {
                if (formData.email) setStep(8);
              }}
            />
          </>
        );
      case 8:
        return (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
              Final Step - What is your phone number?
            </h2>
            <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden">
              <span className="px-3 text-lg bg-gray-50 py-3">🇺🇸</span>
              <input
                type="tel"
                placeholder="(555) 555-5555"
                autoComplete="off"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full p-3 text-base outline-none text-gray-800"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              By clicking Submit, I provide my express written consent to be
              contacted at the number and email provided. I agree to receive
              marketing calls and texts. Message and data rates may apply. Text
              STOP to cancel.
            </p>
            <NextButton
              onClick={() => {
                if (formData.phone) handleSubmit();
              }}
              label={submitting ? "Submitting..." : "Submit"}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pt-10 px-4"
      style={{ backgroundColor: "#eaf4fb" }}
    >
      <div className="text-center mb-8 max-w-2xl">
        <h1
          className="text-3xl md:text-4xl font-bold underline mb-2"
          style={{ color: "#021e80" }}
        >
          GET A CASH OFFER FOR YOUR HOME
        </h1>
        <p className="text-lg" style={{ color: "#021e80" }}>
          No Repairs. No Agents. No Fees!
        </p>
        <p className="text-base text-gray-700 mt-2">
          Fill Out The 30 Second Form To Get Started On Your{" "}
          <strong>FREE CASH OFFER</strong> Now! 🚨
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-[600px]">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm mb-4 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
        )}
        {renderStep()}
      </div>
    </div>
  );
}
