import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Ry Commerce LLC",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white px-6 py-12 max-w-3xl mx-auto text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: April 15, 2026</p>

      <p className="mb-4">
        Ry Commerce LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website and related services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, submit a form, or receive communications from us, including SMS/text messages.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Information We Collect</h2>
      <p className="mb-4">We may collect the following personal information when you submit a form on our website or when we contact you regarding your property:</p>
      <ul className="list-disc pl-6 mb-4 space-y-1">
        <li>First and last name</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Property address</li>
        <li>Information about your property and selling intentions (timeline, repairs needed, reason for selling)</li>
      </ul>
      <p className="mb-4">We may also collect non-personal information such as browser type, IP address, referring URL, and pages visited through cookies and analytics tools.</p>

      <h2 className="text-xl font-bold mt-8 mb-3">How We Use Your Information</h2>
      <p className="mb-4">We use the information we collect to:</p>
      <ul className="list-disc pl-6 mb-4 space-y-1">
        <li>Provide you with a cash offer for your property</li>
        <li>Contact you by phone, email, or SMS/text message regarding your property or our services</li>
        <li>Respond to your inquiries and fulfill your requests</li>
        <li>Improve our website and services</li>
        <li>Comply with applicable laws and regulations</li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">SMS/Text Messaging</h2>
      <p className="mb-4">
        By providing your phone number through our website form or through publicly available property records, you may receive SMS/text messages from Ry Commerce LLC regarding your property and our real estate services. Message frequency varies. Message and data rates may apply.
      </p>
      <p className="mb-4">
        You can opt out of receiving text messages at any time by replying <strong>STOP</strong> to any message. For help, reply <strong>HELP</strong> or contact us at the information provided below.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Sharing of Information</h2>
      <p className="mb-4">
        We do not sell, trade, or rent your personal information to third parties for marketing purposes. We may share your information with trusted service providers who assist us in operating our business (such as CRM platforms, communication tools, and analytics services), provided they agree to keep your information confidential.
      </p>
      <p className="mb-4">We may also disclose your information when required by law, to enforce our policies, or to protect our or others&apos; rights, property, or safety.</p>

      <h2 className="text-xl font-bold mt-8 mb-3">Data Security</h2>
      <p className="mb-4">
        We implement reasonable security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Third-Party Links</h2>
      <p className="mb-4">
        Our website may contain links to third-party websites. We are not responsible for the privacy practices of those websites and encourage you to review their privacy policies.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Your Rights</h2>
      <p className="mb-4">
        You may request access to, correction of, or deletion of your personal information by contacting us. We will respond to your request within a reasonable timeframe.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Changes to This Policy</h2>
      <p className="mb-4">
        We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Contact Us</h2>
      <p className="mb-4">
        If you have any questions about this Privacy Policy, please contact us:
      </p>
      <p className="mb-1"><strong>Ry Commerce LLC</strong></p>
      <p className="mb-1">Email: info@rycommerce.com</p>
      <p className="mb-4">Rylan Patterson</p>
    </div>
  );
}
