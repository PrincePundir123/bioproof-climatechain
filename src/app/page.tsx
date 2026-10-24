import Link from "next/link";
import Image from "next/image";
import workspacePreview from "../../public/images/bioproof/workspace-preview-final.png";
import {
  ArrowUpRight,
  ArrowRight,
  Sprout,
  Truck,
  Factory,
  ShieldCheck,
  Fingerprint,
  Network,
  FileCheck2,
  LockKeyhole,
  ScanLine,
} from "lucide-react";
import { PublicNavigation, PublicFooter } from "@/components/public-shell";
import { FieldPhoto } from "@/components/field-photo";

export default function Home() {
  return (
    <>
      <PublicNavigation />
      <main className="marketing-main" id="main-content">
        <section className="home-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="live-dot" /> FIELD EVIDENCE. INDEPENDENT
              CONFIDENCE.
            </span>
            <h1>
              Every climate claim begins with <em>evidence.</em>
            </h1>
            <p>
              From the field to the facility, make every handover visible.
              Connect agricultural residue, original records, and the people who
              stand behind them.
            </p>
            <div className="row">
              <Link className="button" href="/demo">
                Explore live demo <ArrowUpRight size={18} />
              </Link>
              <Link className="text-link" href="/verify/BP-001">
                View a sample proof <ArrowRight size={18} />
              </Link>
            </div>
            <div className="hero-footnote">
              <ShieldCheck size={19} />
              <span>
                Evidence first. Human review. Inspectable history.
                <small>Sample proof uses synthetic data.</small>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <FieldPhoto name="field" preload />
            <div className="photo-label">
              01 / THE JOURNEY STARTS IN THE FIELD
            </div>
            <div className="hero-note">
              <Sprout size={23} />
              <div>
                <strong>A future for what remains.</strong>
                <span>Make residue journeys accountable.</span>
              </div>
            </div>
          </div>
        </section>
        <div className="journey-ribbon">
          {[
            [Sprout, "Farmer declaration"],
            [Truck, "Collector pickup"],
            [Factory, "Processor intake"],
            [ShieldCheck, "Auditor review"],
          ].map(([Icon, label], i) => {
            const I = Icon as typeof Sprout;
            return (
              <div key={String(label)}>
                <span className="step-index">0{i + 1}</span>
                <I size={21} />
                <span>{String(label)}</span>
                {i < 3 && <ArrowRight size={17} className="ribbon-arrow" />}
              </div>
            );
          })}
        </div>
        <section className="marketing-section story-section">
          <div className="section-heading">
            <span className="eyebrow">
              CONNECTED PEOPLE. CONNECTED RECORDS.
            </span>
            <h2>
              Every handover has a story.
              <br />
              <em>Give it a traceable record.</em>
            </h2>
            <p>
              Good evidence starts with the people doing the work. BioProof
              connects their observations without losing sight of the original
              source.
            </p>
          </div>
          <div className="photo-story-grid">
            <article>
              <FieldPhoto name="harvest" />
              <span className="eyebrow">01 / AT THE SOURCE</span>
              <h3>Start with the field.</h3>
              <p>
                Register the plot, describe the residue, and record the farmer’s
                estimate.
              </p>
            </article>
            <article>
              <FieldPhoto name="collection" />
              <span className="eyebrow">02 / ALONG THE JOURNEY</span>
              <h3>Keep each handover visible.</h3>
              <p>
                Connect pickup measurements with processor intake and supporting
                records.
              </p>
            </article>
            <article>
              <FieldPhoto name="storage" />
              <span className="eyebrow">03 / BEHIND THE CLAIM</span>
              <h3>Preserve what supports it.</h3>
              <p>
                Keep original documents available for an independent, documented
                review.
              </p>
            </article>
          </div>
          <p className="photo-disclaimer">
            Illustrative photography of agricultural work and stored hay. These
            scenes are not evidence for BioProof batches.{" "}
            <Link href="/about#photo-credits">Photo credits ↗</Link>
          </p>
        </section>
        <section className="capability-section">
          <div className="section-heading">
            <span className="eyebrow">BUILT AROUND EVIDENCE</span>
            <h2>Confidence you can inspect.</h2>
            <p>
              A connected workspace for the questions that matter: where did it
              come from, what changed, and who reviewed it?
            </p>
          </div>
          <div className="capability-grid">
            {[
              [
                Truck,
                "Trace the custody",
                "Follow declarations, pickup and intake in one connected history.",
                "/demo",
              ],
              [
                LockKeyhole,
                "Keep sources private",
                "Inspect original files through controlled, time-limited access.",
                "/methodology",
              ],
              [
                Network,
                "Investigate the conflicts",
                "Find reused receipts, mismatched weights and gaps in the record.",
                "/demo/conflicts",
              ],
              [
                FileCheck2,
                "Make review accountable",
                "Keep decisions, explanations and disputes attached to the evidence.",
                "/demo/review",
              ],
              [
                Fingerprint,
                "Replay the proof",
                "Check the hash chain and explore what a changed record reveals.",
                "/demo/lab",
              ],
              [
                ScanLine,
                "Share a public record",
                "Let others inspect the summary while original evidence stays private.",
                "/verify/BP-001",
              ],
            ].map(([Icon, title, description, href]) => {
              const I = Icon as typeof Sprout;
              return (
                <Link
                  href={String(href)}
                  className="capability-card"
                  key={String(title)}
                >
                  <I size={27} />
                  <h3>{String(title)}</h3>
                  <p>{String(description)}</p>
                  <span>
                    Explore <ArrowUpRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="marketing-section product-section">
          <div className="section-heading">
            <span className="eyebrow">
              ONE WORKSPACE. AN INSPECTABLE JOURNEY.
            </span>
            <h2>
              See the record.
              <br />
              <em>Understand the decision.</em>
            </h2>
            <p>
              Move from an overview to the supporting evidence. A clearer view
              for farmers, collectors, processors and auditors.
            </p>
            <Link href="/demo" className="text-link">
              Take a closer look <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="product-preview">
            <div className="preview-bar">
              <span />
              <span />
              <span />
              <small>BioProof / Synthetic demo workspace</small>
            </div>
            <Image
              src={workspacePreview}
              alt="BioProof synthetic demo showing batch records and investigation actions"
              sizes="(max-width: 900px) 100vw, 800px"
            />
            <p>Actual BioProof interface · Synthetic demonstration data</p>
          </div>
        </section>
        <section className="soil-section">
          <FieldPhoto name="soil" />
          <div>
            <span className="eyebrow">LEAVE ROOM FOR THE LAND</span>
            <h2>Responsible removal starts with better questions.</h2>
            <p>
              Residue is also soil cover, nutrients, and organic matter.
              SoilSafe brings removal estimates and agronomic review into the
              conversation.
            </p>
            <p>
              Its guidance is advisory. A recorded quantity does not establish
              sustainable removal or a certified climate benefit.
            </p>
            <Link className="button secondary" href="/methodology">
              Understand SoilSafe <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
        <section className="closing-section">
          <span className="eyebrow">FROM FIELD TO CONFIDENCE</span>
          <h2>
            Follow the journey.
            <br />
            Question the evidence.
          </h2>
          <p>
            Explore a complete synthetic workflow, or sign in to work with your
            own records.
          </p>
          <div className="row">
            <Link href="/demo" className="button">
              Try the demo <ArrowUpRight size={18} />
            </Link>
            <Link href="/login" className="button secondary">
              Sign in to BioProof
            </Link>
          </div>
          <small>
            Record integrity supports accountability. It does not prove physical
            truth or issue carbon credits.
          </small>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
