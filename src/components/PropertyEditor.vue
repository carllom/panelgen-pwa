<script setup lang="ts">
import { computed } from 'vue'
import type { PanelStockItem } from '../domain/PanelComponent'
import { PanelStock } from '../domain/PanelStock'
import type { Guide } from '../domain/Guide'
import { useAppStore } from '../stores/appStore'
import { CircularPocket } from '../domain/CircularPocket'
import { RectangularPocket } from '../domain/RectangularPocket'
import { Dial } from '../domain/Dial'
import { Text } from '../domain/Text'
import { PolyLine } from '../domain/PolyLine'
import { FontFace, HersheyFont } from '../domain/HersheyFont'
import { loadFaceGlyphs } from '../domain/fontLoader'
import PointListEditor from './PointListEditor.vue'
import ToolSelect from './ToolSelect.vue'
import CircularStepsEditor from './CircularStepsEditor.vue'
import FontFaceSelector from './FontFaceSelector.vue'

const store = useAppStore()

const props = defineProps<{ item: PanelStockItem | null; guide?: Guide | null; stock?: PanelStock | null }>()
const emit = defineEmits<{ change: []; beforeChange: [] }>()

const pocket  = computed(() => props.item instanceof CircularPocket    ? props.item : null)
const rect    = computed(() => props.item instanceof RectangularPocket ? props.item : null)
const dial    = computed(() => props.item instanceof Dial              ? props.item : null)
const text    = computed(() => props.item instanceof Text              ? props.item : null)
const poly    = computed(() => props.item instanceof PolyLine          ? props.item : null)

const typeName = computed(() => {
  if (pocket.value)  return 'Circular Pocket'
  if (rect.value)    return 'Rect. Pocket'
  if (dial.value)    return 'Dial'
  if (text.value)    return 'Text'
  if (poly.value)    return 'Polyline'
  return 'Unknown'
})

function num(e: Event): number {
  return parseFloat((e.target as HTMLInputElement).value)
}

function changed(): void { emit('change') }

async function onTextFaceChange(item: Text, face: FontFace): Promise<void> {
  emit('beforeChange')
  const glyphs = await loadFaceGlyphs(face)
  item.font = new HersheyFont(face, glyphs, item.font.size)
  item.fontFace = face
  changed()
}

async function onDialLabelFaceChange(item: Dial, face: FontFace): Promise<void> {
  emit('beforeChange')
  const glyphs = await loadFaceGlyphs(face)
  item.labelFont = new HersheyFont(face, glyphs, item.labelFont.size)
  item.labelFontFace = face
  changed()
}
</script>

<template>
  <aside class="prop-panel">
    <!-- Guide -->
    <template v-if="guide">
      <div class="prop-header">Guide<span style="display:none">{{ store.guideVersion }}</span></div>
      <div class="prop-group">
        <div class="prop-row">
          <label>Direction</label>
          <select :value="guide.direction"
            @focus="emit('beforeChange')"
            @change="guide.direction = ($event.target as HTMLSelectElement).value as 'horizontal' | 'vertical'; changed()"
            class="prop-select">
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </div>
        <div class="prop-row">
          <label>{{ guide.direction === 'horizontal' ? 'Y' : 'X' }}</label>
          <input type="number" step="0.1" :value="guide.pos"
            @focus="emit('beforeChange')" @input="guide.pos = num($event); changed()" />
        </div>
      </div>
    </template>

    <template v-else-if="item">
      <div class="prop-header">{{ typeName }}<span style="display:none">{{ store.itemVersion }}</span></div>

      <!-- Common: position -->
      <div class="prop-group">
        <div class="prop-row">
          <label>X</label>
          <input type="number" step="0.1" :value="item.pos.x"
            @focus="emit('beforeChange')" @input="item.pos.x = num($event); changed()" />
        </div>
        <div class="prop-row">
          <label>Y</label>
          <input type="number" step="0.1" :value="item.pos.y"
            @focus="emit('beforeChange')" @input="item.pos.y = num($event); changed()" />
        </div>
        <div class="prop-row">
          <label>Tool</label>
          <ToolSelect v-model="item.toolNumber" @update:model-value="changed()" />
        </div>
      </div>

      <!-- CircularPocket -->
      <template v-if="pocket">
        <div class="prop-group">
          <div class="prop-row">
            <label>Diameter</label>
            <input type="number" step="0.1" min="0" :value="pocket.diameter"
              @focus="emit('beforeChange')" @input="pocket.diameter = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Depth</label>
            <input type="number" step="0.1" min="0" :value="pocket.depth"
              @focus="emit('beforeChange')" @input="pocket.depth = num($event); changed()" />
          </div>
        </div>
        <CircularStepsEditor :steps="pocket.steps" @change="changed()" />
      </template>

      <!-- RectangularPocket -->
      <template v-if="rect">
        <div class="prop-group">
          <div class="prop-row">
            <label>Width</label>
            <input type="number" step="0.1" min="0" :value="rect.width"
              @focus="emit('beforeChange')" @input="rect.width = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Height</label>
            <input type="number" step="0.1" min="0" :value="rect.height"
              @focus="emit('beforeChange')" @input="rect.height = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Depth</label>
            <input type="number" step="0.1" min="0" :value="rect.depth"
              @focus="emit('beforeChange')" @input="rect.depth = num($event); changed()" />
          </div>
        </div>
      </template>

      <!-- Dial -->
      <template v-if="dial">
        <div class="prop-group">
          <div class="prop-row">
            <label>Label</label>
            <input type="text" :value="dial.text"
              @focus="emit('beforeChange')" @input="dial.text = ($event.target as HTMLInputElement).value; changed()" />
          </div>
          <div class="prop-row">
            <label>Label font</label>
            <FontFaceSelector :modelValue="dial.labelFontFace" @update:modelValue="onDialLabelFaceChange(dial, $event)" />
          </div>
          <div class="prop-row">
            <label>Inner R</label>
            <input type="number" step="0.1" min="0" :value="dial.innerRadius"
              @focus="emit('beforeChange')" @input="dial.innerRadius = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Arc span</label>
            <input type="number" step="1" min="0" max="360" :value="dial.arcSpan"
              @focus="emit('beforeChange')" @input="dial.arcSpan = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Min</label>
            <input type="number" step="1" :value="dial.minValue"
              @focus="emit('beforeChange')" @input="dial.minValue = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Max</label>
            <input type="number" step="1" :value="dial.maxValue"
              @focus="emit('beforeChange')" @input="dial.maxValue = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Step</label>
            <input type="number" step="0.1" min="0.01" :value="dial.step"
              @focus="emit('beforeChange')" @input="dial.step = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Tick len</label>
            <input type="number" step="0.1" min="0" :value="dial.tickLength"
              @focus="emit('beforeChange')" @input="dial.tickLength = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Tick count</label>
            <input type="number" step="1" min="0" :value="dial.tickCount"
              @focus="emit('beforeChange')" @input="dial.tickCount = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Marker len</label>
            <input type="number" step="0.1" min="0" :value="dial.markerLength"
              @focus="emit('beforeChange')" @input="dial.markerLength = num($event); changed()" />
          </div>
        </div>
        <div class="prop-group">
          <div class="prop-row">
            <label>Hole R</label>
            <input type="number" step="0.1" min="0" :value="dial.holeRadius"
              @focus="emit('beforeChange')" @input="dial.holeRadius = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Hole depth</label>
            <input type="number" step="0.1" min="0" :value="dial.holeDepth"
              @focus="emit('beforeChange')" @input="dial.holeDepth = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Hole tool</label>
            <ToolSelect v-model="dial.holeToolNumber" @update:model-value="changed()" />
          </div>
        </div>
      </template>

      <!-- PolyLine -->
      <template v-if="poly">
        <div class="prop-group">
          <div class="prop-row">
            <label>Points</label>
            <span class="prop-count">{{ poly.points.length }}</span>
          </div>
        </div>
        <PointListEditor :points="poly.points" @change="changed()" />
      </template>

      <!-- Text -->
      <template v-if="text">
        <div class="prop-group">
          <div class="prop-row">
            <label>Text</label>
            <input type="text" :value="text.text"
              @focus="emit('beforeChange')" @input="text.text = ($event.target as HTMLInputElement).value; changed()" />
          </div>
          <div class="prop-row">
            <label>Font</label>
            <FontFaceSelector :modelValue="text.fontFace" @update:modelValue="onTextFaceChange(text, $event)" />
          </div>
          <div class="prop-row">
            <label>Font size</label>
            <input type="number" step="0.5" min="0.5" :value="text.font.size"
              @focus="emit('beforeChange')" @input="text.font.size = num($event); changed()" />
          </div>
        </div>
      </template>

    </template>

    <!-- Panel stock (shown when no item is selected and select tool is active) -->
    <template v-else-if="stock">
      <div class="prop-header">Panel Stock</div>
      <div class="prop-group">
        <div class="prop-row">
          <label>Width</label>
          <input type="number" step="0.5" min="1" :value="stock.width"
            @focus="emit('beforeChange')" @input="stock.width = num($event); changed()" />
        </div>
        <div class="prop-row">
          <label>Height</label>
          <input type="number" step="0.5" min="1" :value="stock.height"
            @focus="emit('beforeChange')" @input="stock.height = num($event); changed()" />
        </div>
        <div class="prop-row">
          <label>Thickness</label>
          <input type="number" step="0.1" min="0.1" :value="stock.thickness"
            @focus="emit('beforeChange')" @input="stock.thickness = num($event); changed()" />
        </div>
      </div>
      <div class="prop-group">
        <div class="prop-row">
          <label>Center X</label>
          <input type="number" step="0.1" :value="stock.pos.x"
            @focus="emit('beforeChange')" @input="stock.pos.x = num($event); changed()" />
        </div>
        <div class="prop-row">
          <label>Center Y</label>
          <input type="number" step="0.1" :value="stock.pos.y"
            @focus="emit('beforeChange')" @input="stock.pos.y = num($event); changed()" />
        </div>
      </div>
    </template>

    <div v-else class="prop-empty">No selection</div>
  </aside>
</template>

<style scoped>
.prop-panel {
  width: 220px;
  min-width: 220px;
  background: #16213e;
  border-left: 1px solid #0f3460;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.prop-header {
  padding: 8px 10px;
  font-weight: 600;
  color: #4fc3f7;
  border-bottom: 1px solid #0f3460;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.prop-group {
  border-bottom: 1px solid #1a2a4a;
  padding: 4px 0;
}

.prop-row {
  display: flex;
  align-items: center;
  padding: 3px 10px;
  gap: 6px;
}

.prop-row label {
  width: 72px;
  min-width: 72px;
  color: #8899bb;
  font-size: 11px;
}

.prop-row input {
  flex: 1;
  min-width: 0;
  background: #0d1b35;
  border: 1px solid #1e3a5a;
  color: #e0e0e0;
  border-radius: 3px;
  padding: 2px 5px;
  font-size: 12px;
  font-family: inherit;
}

.prop-row input:focus {
  outline: none;
  border-color: #4fc3f7;
}

.prop-select {
  flex: 1;
  min-width: 0;
  background: #0d1b35;
  border: 1px solid #1e3a5a;
  color: #e0e0e0;
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 12px;
  font-family: inherit;
}

.prop-count {
  color: #556;
  font-size: 11px;
}

.prop-empty {
  padding: 12px 10px;
  color: #556;
  font-size: 11px;
}
</style>
