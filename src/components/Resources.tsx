import { PageHeader } from './PageHeader'
import { useFakeLoad } from '../useFakeLoad'

type ResourceRow = { term: string; detail: string }
type ResourceGroup = { title: string; rows: ResourceRow[] }

const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    title: 'File naming',
    rows: [
      { term: 'Convention', detail: '{ClientCode}_{Deliverable}_{Topic}_v{n}.{ext}' },
      { term: 'Example', detail: 'YFL_Reel_SummerLease_v3.mp4' },
      { term: 'Versions', detail: 'Increment v{n} on every redelivery — never overwrite a prior version.' },
    ],
  },
  {
    title: 'Export presets',
    rows: [
      { term: 'Social (vertical)', detail: 'H.264 · 1080×1920 · 16 Mbps · AAC 256 kbps' },
      { term: 'Social (horizontal)', detail: 'H.264 · 1920×1080 · 16 Mbps · AAC 256 kbps' },
      { term: 'Master', detail: 'ProRes 422 HQ · source resolution · 35 Mbps min for 4K delivery' },
    ],
  },
  {
    title: 'Brand graphics standards',
    rows: [
      { term: 'Palette', detail: 'Monochrome base with a single client accent — never two accents in one asset.' },
      { term: 'Safe area', detail: 'Keep titles inside the 10% mobile safe margin on all vertical exports.' },
      { term: 'Type', detail: 'Inter Tight for display, weights 500–600. No system-default fonts in final graphics.' },
    ],
  },
  {
    title: 'Editor style references',
    rows: [
      { term: 'Pacing', detail: 'Hook in the first 2 seconds; cut to the offer or payoff fast.' },
      { term: 'Transitions', detail: 'Match approved reference cuts before introducing any new treatment.' },
      { term: 'Audio', detail: 'Music sits ~4 dB under voice-over; normalize delivery to −14 LUFS.' },
    ],
  },
]

export function Resources() {
  const isLoading = useFakeLoad()

  return (
    <>
      <PageHeader eyebrow="Standards & references" title="Resources" />
      {isLoading ? (
        <div className="resources-skeleton" aria-hidden="true">
          <div className="surface skeleton-box-lg" />
          <div className="surface skeleton-box-lg" />
        </div>
      ) : (
        <div className="resource-groups">
          {RESOURCE_GROUPS.map((group) => (
            <section key={group.title} className="surface">
              <h2 className="section-head">{group.title}</h2>
              <dl className="definition-rows">
                {group.rows.map((row) => (
                  <div key={row.term} className="definition-row">
                    <dt>{row.term}</dt>
                    <dd>{row.detail}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
