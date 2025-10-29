<script lang="ts">
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();
</script>

<main>
  <div class="login-card">
    <div class="login-inner">
      <div class="stack">
        <form method="POST">
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            required
          />
          <button type="submit">Enter</button>
        </form>
        {#if form?.error}
          <p class="error">{form.error}</p>
        {/if}
      </div>
    </div>
  </div>
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    color: #fff;
    font-family: sans-serif;
  }

  .login-card {
    position: relative;
    width: 100%;
    max-width: 360px;
    padding: 2px; /* gradient border thickness */
    border-radius: 14px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.18),
      rgba(255, 255, 255, 0.06)
    );
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  }

  .login-inner {
    background: rgba(16, 16, 24, 0.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 28px 24px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .stack {
    display: grid;
    gap: 12px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  input {
    padding: 0.85rem 0.9rem;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background-color: rgba(255, 255, 255, 0.06);
    color: #e6e6e6;
    font-size: 1rem;
    text-align: left;
    outline: none;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      background-color 0.2s ease;
  }

  input::placeholder {
    color: rgba(230, 230, 230, 0.6);
  }

  input:focus {
    background-color: rgba(255, 255, 255, 0.08);
    border-color: rgba(122, 162, 255, 0.65);
    box-shadow: 0 0 0 4px rgba(122, 162, 255, 0.15);
  }

  button {
    padding: 0.85rem 0.9rem;
    border: none;
    border-radius: 10px;
    background-image: linear-gradient(135deg, #4f46e5, #06b6d4);
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease,
      filter 0.15s ease;
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.25);
  }

  button:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.35);
  }

  button:active {
    transform: translateY(0);
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.25);
  }

  .error {
    margin: 0;
    color: #ff6b6b;
    font-size: 0.95rem;
    background: rgba(255, 107, 107, 0.08);
    border: 1px solid rgba(255, 107, 107, 0.25);
    padding: 8px 10px;
    border-radius: 8px;
  }
</style>
