import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions - Ry Commerce LLC",
};

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-white px-6 py-12 max-w-3xl mx-auto text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Terms and Conditions</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: April 15, 2026</p>

      <p className="mb-4">
        By using the Ry Commerce LLC website, submitting a form, or receiving SMS/text messages from us, you agree to the following terms and conditions.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Program Name</h2>
      <p className="mb-4">Ry Commerce LLC Property Outreach Program</p>

      <h2 className="text-xl font-bold mt-8 mb-3">Program Description</h2>
      <p className="mb-4">
        Ry Commerce LLC sends personalized outbound SMS messages to residential property owners to inquire about their interest in selling their property. Messages include the owner&apos;s property address and city. Ry Commerce LLC also contacts individuals who submit their information through our website form requesting a cash offer on their property. Recipients can opt out at any time by replying STOP.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Consent to Receive Messages</h2>
      <p className="mb-4">
        By submitting your information through our website form, you provide your express written consent to receive SMS/text messages and marketing communications from Ry Commerce LLC at the phone number provided. Consent is not a condition of any purchase.
      </p>
      <p className="mb-4">
        Ry Commerce LLC may also contact property owners using contact information sourced from publicly available real estate records. Prior to sending any messages, recipients are identified as potential motivated sellers based on property ownership criteria and real estate agent introductions. The initial SMS message clearly identifies the sender by name, states the purpose of the message, and includes opt-out instructions. Consent to continue communication is established when the recipient responds to the initial outreach. All subsequent messages are only sent to recipients who have engaged with the initial message.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Message Frequency</h2>
      <p className="mb-4">
        Message frequency varies based on your engagement and communication with us. You may receive multiple messages related to your property inquiry or our services.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Message and Data Rates</h2>
      <p className="mb-4">
        Standard message and data rates may apply depending on your mobile carrier and plan. Ry Commerce LLC is not responsible for any charges incurred from receiving text messages.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Opt-Out Instructions</h2>
      <p className="mb-4">
        You may opt out of receiving SMS/text messages at any time by replying <strong>STOP</strong> to any message you receive from us. Upon receiving your opt-out request, you will receive a one-time confirmation message and no further messages will be sent.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Help</h2>
      <p className="mb-4">
        For assistance, reply <strong>HELP</strong> to any message or contact us directly:
      </p>
      <p className="mb-1"><strong>Ry Commerce LLC</strong></p>
      <p className="mb-1">Email: info@rycommerce.com</p>
      <p className="mb-4">Rylan Patterson</p>

      <h2 className="text-xl font-bold mt-8 mb-3">Supported Carriers</h2>
      <p className="mb-4">
        Our messaging services are supported by major U.S. carriers including AT&amp;T, Verizon, T-Mobile, Sprint, and others. Carrier support may vary.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Liability</h2>
      <p className="mb-4">
        Ry Commerce LLC is not liable for any delays or failures in message delivery. We are not responsible for any damages arising from the use of or inability to use our messaging services.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Changes to These Terms</h2>
      <p className="mb-4">
        We reserve the right to modify these terms at any time. Changes will be posted on this page with an updated revision date. Continued use of our services after changes constitutes acceptance of the updated terms.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Contact Us</h2>
      <p className="mb-4">
        If you have questions about these Terms and Conditions, please contact us:
      </p>
      <p className="mb-1"><strong>Ry Commerce LLC</strong></p>
      <p className="mb-1">Email: info@rycommerce.com</p>
      <p className="mb-4">Rylan Patterson</p>
    </div>
  );
}
