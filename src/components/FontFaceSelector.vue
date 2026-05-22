<script setup lang="ts">
import { FontFace } from '../domain/HersheyFont'

defineProps<{ modelValue: FontFace }>()
defineEmits<{ 'update:modelValue': [FontFace] }>()

const FONT_OPTIONS: { face: FontFace; label: string }[] = [
  { face: FontFace.RomanSimplex,         label: 'Roman Simplex' },
  { face: FontFace.RomanPlain,           label: 'Roman Plain' },
  { face: FontFace.RomanComplex,         label: 'Roman Complex' },
  { face: FontFace.RomanComplexSmall,    label: 'Roman Complex Sm.' },
  { face: FontFace.RomanDuplex,          label: 'Roman Duplex' },
  { face: FontFace.RomanTriplex,         label: 'Roman Triplex' },
  { face: FontFace.ItalicComplex,        label: 'Italic Complex' },
  { face: FontFace.ItalicComplexSmall,   label: 'Italic Complex Sm.' },
  { face: FontFace.ItalicTriplex,        label: 'Italic Triplex' },
  { face: FontFace.ScriptSimplex,        label: 'Script Simplex' },
  { face: FontFace.ScriptComplex,        label: 'Script Complex' },
  { face: FontFace.GreekSimplex,         label: 'Greek Simplex' },
  { face: FontFace.GreekPlain,           label: 'Greek Plain' },
  { face: FontFace.GreekComplex,         label: 'Greek Complex' },
  { face: FontFace.GreekComplexSmall,    label: 'Greek Complex Sm.' },
  { face: FontFace.CyrillicComplex,      label: 'Cyrillic Complex' },
  { face: FontFace.GothicEnglishTriplex, label: 'Gothic English' },
  { face: FontFace.GothicGermanTriplex,  label: 'Gothic German' },
  { face: FontFace.GothicItalianTriplex, label: 'Gothic Italian' },
  { face: FontFace.Japanese,             label: 'Japanese' },
]
</script>

<template>
  <select
    class="font-select"
    :value="modelValue"
    @change="$emit('update:modelValue', +($event.target as HTMLSelectElement).value as FontFace)"
  >
    <option v-for="opt in FONT_OPTIONS" :key="opt.face" :value="opt.face">
      {{ opt.label }}
    </option>
  </select>
</template>

<style scoped>
.font-select {
  flex: 1;
  min-width: 0;
  background: #0d1b35;
  border: 1px solid #1e3a5a;
  color: #e0e0e0;
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.font-select:focus {
  outline: none;
  border-color: #4fc3f7;
}
</style>
