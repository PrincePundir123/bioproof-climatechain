import Link from "next/link";
import { PublicNavigation, PublicFooter } from "@/components/public-shell";
import { FieldPhoto } from "@/components/field-photo";
export default function Methodology() {
  return (
    <>
      <PublicNavigation />
      <main className="editorial-main">
        <div className="editorial-heading">
          <span className="eyebrow">OUR METHODOLOGY</span>
          <h1>
            Clear boundaries.
            <br />
            Stronger evidence.
          </h1>
          <p>
            Know what the record tells you, what it cannot establish, and where
            independent judgment matters.
          </p>
        </div>
        <FieldPhoto name="soil" className="editorial-photo" />
        <p className="photo-disclaimer">
          Illustrative soil photograph, not an assessment of any recorded farm.{" "}
          <Link href="/about#photo-credits">Photo credits ↗</Link>
        </p>
        <div className="editorial-grid">
          {[
            [
              "What is verified",
              "BioProof records actor submissions, checks contradictions, and preserves decisions in a SHA-256 event chain. Independent human review evaluates the supporting records. A local hash chain alone cannot prevent a database administrator from rewriting and rehashing history.",
            ],
            [
              "What blockchain adds",
              "A confirmed Sepolia transaction establishes an external commitment to a particular version of the record. It does not prove that a physical collection happened, that a document was truthful, or that an environmental benefit occurred. An unconfigured network is always shown as unavailable.",
            ],
            [
              "Weight reconciliation",
              "Comparisons use kg and compatible measurement bases. Where moisture is known, dry mass = wet mass × (1 − moisture percentage / 100). Missing or incompatible bases require reconciliation. The default 5% discrepancy threshold is a configurable platform investigation threshold, not a scientific or regulatory limit.",
            ],
            [
              "SoilSafe is an advisory",
              "Removal proportion is descriptive, using farmer estimates on the same mass basis. Missing inputs mean insufficient information. A site-specific agronomic review must consider soil cover, erosion, nutrients, climate, and competing uses. A 70% high-removal UI warning is a product attention cue, not a universal safety boundary.",
            ],
            [
              "No automatic carbon credits",
              "Recorded residue mass is not converted into avoided emissions or certified credits. A selected biochar or composting pathway does not prove treatment occurred. A defensible environmental estimate would require an applicable methodology, baseline, process measurements, emission factors, and uncertainty assessment.",
            ],
            [
              "Privacy and synthetic data",
              "Original receipts, exact locations, actor identities, and private explanations are excluded from public verification. The demo uses synthetic records and isolated session memory; changes are not production database transactions.",
            ],
          ].map(([h, p]) => (
            <section className="card" key={h}>
              <h2>{h}</h2>
              <p>{p}</p>
            </section>
          ))}
          <section className="card">
            <h2>Further reading</h2>
            <p>
              <a href="https://www.nrcs.usda.gov/sites/default/files/2024-10/HarvestingCropResidueOctober2016.pdf">
                USDA NRCS: Harvesting Crop Residue (Iowa, 2016)
              </a>{" "}
              discusses nutrient removal, erosion and soil organic matter. Its
              regional observations are not universal thresholds for Indian
              farms.
            </p>
            <p>
              <a href="https://www.fao.org/conservation-agriculture/en/">
                FAO conservation agriculture
              </a>
            </p>
            <p>
              <a href="https://verra.org/methodologies/vm0044-biochar-utilization-in-soil-and-non-soil-applications-v1-2/">
                Verra VM0044 biochar methodology reference
              </a>{" "}
              — BioProof does not implement credit issuance or claim
              certification under this methodology.
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
