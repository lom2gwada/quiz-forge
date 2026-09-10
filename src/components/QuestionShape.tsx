/** Silhouette d'un territoire (contour) : SVG inline généré au build (src/data/shapes.ts, contenu de
 * confiance). Recoloré par `currentColor` via `.question-shape` dans styles.css → suit le thème. */
export function QuestionShape({ svg, alt, className }: { svg: string; alt?: string; className?: string }) {
  return (
    <div
      className={className ? `question-shape ${className}` : 'question-shape'}
      role="img"
      aria-label={alt ?? 'Silhouette d’un territoire.'}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
