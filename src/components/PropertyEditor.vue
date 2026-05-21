<script setup lang="ts">
import { computed } from 'vue'
import type { PanelStockItem } from '../domain/PanelComponent'
import { PanelStock } from '../domain/PanelStock'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
import { CircularPocket } from '../domain/CircularPocket'
import { RectangularPocket } from '../domain/RectangularPocket'
import { Dial } from '../domain/Dial'
import { Text } from '../domain/Text'
import { PolyLine } from '../domain/PolyLine'
import PointListEditor from './PointListEditor.vue'

const props = defineProps<{ item: PanelStockItem | null; stock?: PanelStock | null }>()
const emit = defineEmits<{ change: [] }>()

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
</script>

<template>
  <aside class="prop-panel">
    <template v-if="item">
      <div class="prop-header">{{ typeName }}<span style="display:none">{{ store.itemVersion }}</span></div>

      <!-- Common: position -->
      <div class="prop-group">
        <div class="prop-row">
          <label>X</label>
          <input type="number" step="0.1" :value="item.pos.x"
            @input="item.pos.x = num($event); changed()" />
        </div>
        <div class="prop-row">
          <label>Y</label>
          <input type="number" step="0.1" :value="item.pos.y"
            @input="item.pos.y = num($event); changed()" />
        </div>
        <div class="prop-row">
          <label>Tool</label>
          <input type="number" step="1" min="0" :value="item.toolNumber"
            @input="item.toolNumber = num($event); changed()" />
        </div>
      </div>

      <!-- CircularPocket -->
      <template v-if="pocket">
        <div class="prop-group">
          <div class="prop-row">
            <label>Diameter</label>
            <input type="number" step="0.1" min="0" :value="pocket.diameter"
              @input="pocket.diameter = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Depth</label>
            <input type="number" step="0.1" min="0" :value="pocket.depth"
              @input="pocket.depth = num($event); changed()" />
          </div>
        </div>
      </template>

      <!-- RectangularPocket -->
      <template v-if="rect">
        <div class="prop-group">
          <div class="prop-row">
            <label>Width</label>
            <input type="number" step="0.1" min="0" :value="rect.width"
              @input="rect.width = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Height</label>
            <input type="number" step="0.1" min="0" :value="rect.height"
              @input="rect.height = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Depth</label>
            <input type="number" step="0.1" min="0" :value="rect.depth"
              @input="rect.depth = num($event); changed()" />
          </div>
        </div>
      </template>

      <!-- Dial -->
      <template v-if="dial">
        <div class="prop-group">
          <div class="prop-row">
            <label>Label</label>
            <input type="text" :value="dial.text"
              @input="dial.text = ($event.target as HTMLInputElement).value; changed()" />
          </div>
          <div class="prop-row">
            <label>Inner R</label>
            <input type="number" step="0.1" min="0" :value="dial.innerRadius"
              @input="dial.innerRadius = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Arc span</label>
            <input type="number" step="1" min="0" max="360" :value="dial.arcSpan"
              @input="dial.arcSpan = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Min</label>
            <input type="number" step="1" :value="dial.minValue"
              @input="dial.minValue = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Max</label>
            <input type="number" step="1" :value="dial.maxValue"
              @input="dial.maxValue = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Step</label>
            <input type="number" step="0.1" min="0.01" :value="dial.step"
              @input="dial.step = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Tick len</label>
            <input type="number" step="0.1" min="0" :value="dial.tickLength"
              @input="dial.tickLength = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Tick count</label>
            <input type="number" step="1" min="0" :value="dial.tickCount"
              @input="dial.tickCount = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Marker len</label>
            <input type="number" step="0.1" min="0" :value="dial.markerLength"
              @input="dial.markerLength = num($event); changed()" />
          </div>
        </div>
        <div class="prop-group">
          <div class="prop-row">
            <label>Hole R</label>
            <input type="number" step="0.1" min="0" :value="dial.holeRadius"
              @input="dial.holeRadius = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Hole depth</label>
            <input type="number" step="0.1" min="0" :value="dial.holeDepth"
              @input="dial.holeDepth = num($event); changed()" />
          </div>
          <div class="prop-row">
            <label>Hole tool</label>
            <input type="number" step="1" min="0" :value="dial.holeToolNumber"
              @input="dial.holeToolNumber = num($event); changed()" />
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
              @input="text.text = ($event.target as HTMLInputElement).value; changed()" />
          </div>
          <div class="prop-row">
            <label>Font size</label>
            <input type="number" step="0.5" min="0.5" :value="text.font.size"
              @input="text.font.size = num($event); changed()" />
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
            @input="stock.width = num($event); changed()" />
        </div>
        <div class="prop-row">
          <label>Height</label>
          <input type="number" step="0.5" min="1" :value="stock.height"
            @input="stock.height = num($event); changed()" />
        </div>
        <div class="prop-row">
          <label>Thickness</label>
          <input type="number" step="0.1" min="0.1" :value="stock.thickness"
            @input="stock.thickness = num($event); changed()" />
        </div>
      </div>
      <div class="prop-group">
        <div class="prop-row">
          <label>Center X</label>
          <input type="number" step="0.1" :value="stock.pos.x"
            @input="stock.pos.x = num($event); changed()" />
        </div>
        <div class="prop-row">
          <label>Center Y</label>
          <input type="number" step="0.1" :value="stock.pos.y"
            @input="stock.pos.y = num($event); changed()" />
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
