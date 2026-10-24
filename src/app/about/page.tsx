import Link from "next/link";
import { PublicNavigation, PublicFooter } from "@/components/public-shell";
import { FieldPhoto } from "@/components/field-photo";
export default function About() {
  return (
    <>
      <PublicNavigation />
      <main className="editorial-main">
        <div className="editorial-heading">
          <span className="eyebrow">WHY BIOPROOF EXISTS</span>
          <h1>
            Better records.
            <br />
            <em>More accountable journeys.</em>
          </h1>
          <p>
            Agricultural residue changes hands. Its evidence should stay
            connected. BioProof brings farmer declarations, collection records,
            processor receipts and independent review into one inspectable
            history.
          </p>
        </div>
        <FieldPhoto name="collection" className="editorial-photo" />
        <div className="editorial-grid">
          <section className="card">
            <span className="eyebrow">THE PEOPLE BEHIND THE RECORD</span>
            <h2>Four roles. Shared accountability.</h2>
            <p>
              Farmers declare. Collectors record pickup. Processors document
              intake. Auditors examine the supporting evidence and record an
              independent decision.
            </p>
            <Link href="/demo" className="text-link">
              Explore the synthetic workflow →
            </Link>
          </section>
          <section className="card">
            <span className="eyebrow">EVIDENCE BEFORE CLAIMS</span>
            <h2>Make the boundaries visible.</h2>
            <p>
              BioProof checks contradictions and record integrity. It does not
              certify physical observations, automatically issue carbon credits,
              or replace agronomic judgment.
            </p>
            <Link href="/methodology" className="text-link">
              Read the verification boundaries →
            </Link>
          </section>
        </div>
        <section id="photo-credits" className="credits-list">
          <span className="eyebrow">REAL PHOTOGRAPHY. CLEAR ATTRIBUTION.</span>
          <h2>Photography credits</h2>
          <p>
            These agricultural scenes illustrate our purpose. They are not
            photographs of BioProof customers, field pilots or user batches, and
            do not imply endorsement. All are real photographs provided under
            the <a href="https://www.pexels.com/license/">Pexels license</a>.
          </p>
          <ul>
            {[
              [
                "Tom Fisk",
                "Aerial corn harvest in Austin, Minnesota",
                "farm-tractor-harvesting-on-field-1595106",
              ],
              [
                "Tran Le Tuan",
                "Workers collecting straw bales",
                "collecting-bales-of-straw-after-harvest-16236227",
              ],
              [
                "Laker",
                "Stored dry hay bales",
                "stacks-of-dry-hay-in-barn-6156559",
              ],
              [
                "ahadi muyali",
                "Hands holding soil and seeds",
                "hands-holding-soil-and-seeds-15182672",
              ],
              [
                "Wolfgang Weiser",
                "Harvested wheat field in Hohenhorn, Germany",
                "golden-wheat-field-with-straw-bales-in-summer-38816552",
              ],
            ].map(([name, subject, slug]) => (
              <li key={slug}>
                <a href={`https://www.pexels.com/photo/${slug}/`}>{subject}</a>{" "}
                — {name} / Pexels
              </li>
            ))}
          </ul>
          <p>
            Product previews show BioProof’s own synthetic demonstration.
            Private evidence is never used as marketing imagery.
          </p>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
