import type { Category, Difficulty } from '../types/quiz'
import { playClick } from '../utils/sound'

interface FilterPanelProps {
  categories: Category[]
  selectedCategories: string[]
  difficulty: Difficulty | ''
  onCategoryToggle: (categoryId: string) => void
  onDifficultyChange: (value: Difficulty | '') => void
}

export function FilterPanel({ categories, selectedCategories, difficulty, onCategoryToggle, onDifficultyChange }: FilterPanelProps) {
  return <section className="filter-panel" aria-label="Filtres du quiz">
    <fieldset className="category-filter">
      <legend>Catégories</legend>
      <div className="category-checkboxes">
        {categories.map((item) => <label key={item.id} className="category-checkbox">
          <input type="checkbox" checked={selectedCategories.includes(item.id)} onChange={() => { playClick(); onCategoryToggle(item.id) }} />
          {item.label}
        </label>)}
      </div>
      <p className="category-hint">{selectedCategories.length ? `${selectedCategories.length} catégorie${selectedCategories.length > 1 ? 's' : ''} sélectionnée${selectedCategories.length > 1 ? 's' : ''}` : 'Toutes les catégories'}</p>
    </fieldset>
    <label>Difficulté
      <select value={difficulty} onChange={(event) => { playClick(); onDifficultyChange(event.target.value as Difficulty | '') }}>
        <option value="">Toutes les difficultés</option>
        <option value="easy">Facile</option>
        <option value="medium">Intermédiaire</option>
        <option value="hard">Difficile</option>
      </select>
    </label>
  </section>
}
