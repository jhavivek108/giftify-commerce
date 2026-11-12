import { Link } from 'react-router-dom';
import { BRAND_NAME, INSTAGRAM_HANDLE, whatsappDisplayNumber } from '../utils/whatsapp';

/**
 * Plain-language policy pages. They describe how this website actually works.
 * The shop owner should review them (and have them checked) before launch.
 */
function Page({ eyebrow, title, children }) {
  return (
    <div className="container-page pb-6 pt-10 sm:pt-14">
      <article className="surface mx-auto max-w-3xl p-7 sm:p-12">
        <p className="eyebrow text-[#B8935A]">{eyebrow}</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{title}</h1>
        <div className="prose-lgs mt-6 text-olive/90">{children}</div>
        <p className="mt-8 border-t border-line pt-6 text-sm text-muted">
          Questions? Message us on WhatsApp at {whatsappDisplayNumber()}, on Instagram at {INSTAGRAM_HANDLE}, or through the{' '}
          <Link to="/contact" className="underline">
            contact page
          </Link>
          .
        </p>
      </article>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <Page eyebrow="Legal" title="Privacy Policy">
      <p>{BRAND_NAME} is a small handmade business. This page explains what information this website collects and how it is used.</p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address, optional phone number and a password. Passwords are stored only in hashed form; we cannot read them.
        </li>
        <li>
          <strong>Order details:</strong> your name, email, phone number, delivery address, the items you order, any customisation instructions or personal messages, and your delivery notes.
        </li>
        <li>
          <strong>Messages:</strong> anything you send through the contact or business enquiry forms, and your email address if you subscribe to updates.
        </li>
        <li>
          <strong>On your device:</strong> a sign-in cookie that keeps you logged in, and your cart and wishlist saved in your browser when you are not signed in.
        </li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To make, confirm and deliver your order, and to contact you about it.</li>
        <li>To reply to your messages and enquiries.</li>
        <li>To send updates about new designs, only if you subscribed.</li>
      </ul>
      <h2>Sharing</h2>
      <p>We do not sell your information. It is shared only where needed to fulfil your order, for example with a delivery partner, or where the law requires it.</p>
      <h2>WhatsApp and Instagram</h2>
      <p>When you choose to order or chat through WhatsApp or Instagram, this website only opens those apps with a message filled in. Nothing is sent until you send it, and those conversations are covered by the privacy policies of those services.</p>
      <h2>Your choices</h2>
      <p>You can ask us to correct or delete your account and order information, or to stop sending updates, at any time by contacting us.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page eyebrow="Legal" title="Terms and Conditions">
      <p>By using this website or placing an order with {BRAND_NAME}, you agree to the terms below.</p>
      <h2>Handmade products</h2>
      <p>Every piece is made by hand. Small differences in shape, size and shade from the photographs are natural and part of what makes each piece unique. Custom colours and designs are made as closely as possible to your request.</p>
      <h2>Prices</h2>
      <p>Prices are shown in Indian Rupees and are as listed in our product catalogue. Some items are sold as a set or a pair; this is shown next to the price. Delivery charges, where they apply, are confirmed with your order.</p>
      <h2>Orders</h2>
      <p>An order placed on this website is a request to buy. We confirm it with you before making it. You can cancel an order from My Orders while its status is “Placed”. After that, please contact us, because work on your piece may already have started.</p>
      <h2>Payment</h2>
      <p>We currently accept Cash on Delivery and online payment that we confirm manually. An order is marked as paid only after we have verified that the payment was received.</p>
      <h2>Delivery</h2>
      <p>Delivery details and timelines are confirmed with you when we confirm your order. Please make sure your address and phone number are correct.</p>
      <h2>Problems with an order</h2>
      <p>If your order arrives damaged or is not what you ordered, contact us with a photograph as soon as you can and we will work out a solution with you.</p>
      <h2>Reviews</h2>
      <p>Reviews should be honest and about products you have received. We may remove reviews that are abusive or unrelated.</p>
      <h2>Changes</h2>
      <p>We may update these terms from time to time. The version on this page is the one that applies.</p>
    </Page>
  );
}

export function NotFound() {
  return (
    <div className="container-page grid place-items-center py-24 text-center">
      <div>
        <p className="font-script text-8xl text-rose">Oops</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">We could not find that page.</h1>
        <p className="mt-3 text-muted">It may have moved, or the link may be mistyped.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link to="/shop" className="btn btn-outline">
            Explore collection
          </Link>
        </div>
      </div>
    </div>
  );
}
