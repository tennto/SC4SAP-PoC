/**
 * Terms of use.
 *
 * Intentionally empty. The route, the title and the shell exist so the account
 * menu has somewhere to point and so the copy has a shape to be dropped into;
 * writing placeholder legal text would be worse than none, because placeholder
 * terms read as real ones.
 */
import type { Metadata } from "next";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Terms of Use · SC4SAP" };

export default function TermsPage() {
  return (
    <div className="page">
      <header className="page-head rise">
        <div>
          <p className="eyebrow">Legal</p>
          <h1>Terms of Use</h1>
          <p className="page-lede">
            The terms governing use of SC4SAP and the systems it connects to.
          </p>
        </div>
      </header>

      <section
        className="panel empty-state rise"
        style={{ "--delay": "110ms" } as React.CSSProperties}
      >
        <Icon name="scroll" />
        <p className="empty-title">No content yet</p>
        <p className="panel-note">
          This page is a placeholder. The terms have not been written, and
          nothing here should be read as an agreement.
        </p>
      </section>
    </div>
  );
}
