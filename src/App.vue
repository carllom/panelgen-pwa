<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app">
    <header>
      <span class="app-title">PanelGen</span>
      <nav class="header-nav">
        <RouterLink to="/" class="nav-link">Editor</RouterLink>
        <RouterLink to="/settings" class="nav-link">Settings</RouterLink>
      </nav>
    </header>
    <RouterView class="router-view" />
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
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0 1rem;
  height: 44px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  flex-shrink: 0;
}

.app-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #4fc3f7;
}

.header-nav {
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #8899bb;
  text-decoration: none;
  border: 1px solid transparent;
  transition: color 0.1s, background 0.1s;
}

.nav-link:hover {
  color: #e0e0e0;
  background: #1a3a5c;
}

.nav-link.router-link-active {
  color: #4fc3f7;
  background: #0f2a45;
  border-color: #1e5a80;
}

.router-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
