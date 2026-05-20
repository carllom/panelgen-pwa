<script setup lang="ts">
</script>

<template>
  <div class="app">
    <header>
      <h1>PanelGen</h1>
    </header>
    <main>
      <p>Front panel CAD — porting in progress.</p>
    </main>
  </div>
</template>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #1a1a2e;
  color: #e0e0e0;
  font-family: system-ui, sans-serif;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

header {
  padding: 0.75rem 1rem;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
}

header h1 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4fc3f7;
}

main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}
</style>
