import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
// Next enforces this boundary during its build; plain Vitest has no RSC loader.
vi.mock('server-only', () => ({}))
