This file provides instructions and conventions for AI agents working with this codebase.

## Codebase Structure

-   `src/`: Contains all the source code for the application.
    -   `App.tsx`: The main application component. It initializes the Zustand store and renders the main layout. It does not render `EstimateCostPanel`.
    -   `state/`: Contains the Zustand store for global state management.
        -   `store.ts`: Defines the Zustand store, including the state shape, actions, and persistence logic using IndexedDB.
    -   `components/`: Contains all React components.
        -   `SheetUploadPanel.tsx`: The top panel, for handling file uploading (CSV, TSV, XLSX, XLS) and displaying the data grid. It interacts directly with the Zustand store.
        -   `PromptTemplatePanel.tsx`: The second panel, providing the text area for creating the prompt template and inserting header tags. It interacts directly with the Zustand store.
        -   `ApiPanel.tsx`: The third panel, for managing API key, model selection, and testing the generated prompt. It also provides access to advanced API settings via a modal, whose state is managed globally via Zustand.
        -   `ActionPanel.tsx`: Allows the user to process all rows of the CSV in parallel and download the results. It is connected to the Zustand store and includes the `EstimateCostPanel`.
        -   `EstimateCostPanel.tsx`: A panel for estimating the cost of processing the entire CSV file. It fetches data from the Zustand store.
        -   `IndividualResultsPanel.tsx`: Displays the results of individual API calls for each row.
        -   `Panel.tsx`: A generic container component for consistent styling of panels.
        -   `icons.tsx`: SVG icon components.
    -   `services/`: Contains modules for handling external services.
        -   `api.ts`: Manages all interactions with the OpenRouter API, including testing and batch processing.
    -   `types.ts`: Holds shared TypeScript type definitions.
    -   `utils/indexedDB.ts`: A utility module for managing IndexedDB interactions.
    -   `i18n.ts`: The i18next configuration file for internationalization.
    -   `locales/`: Contains JSON files for different languages.
    -   `index.tsx`: The entry point of the React application.

## State Management with Zustand

-   **`store.ts`**: The single source of truth for the application state.
-   **State**: The store manages all shared state, including:
    -   `csvData`, `promptTemplate`, `apiKey`, `model`.
    -   API call status: `apiResponse`, `apiLoading`, `isProcessingAllRows`.
    -   Results: `processedResults`, `processedRowCount`, `individualResponses`.
    -   Cost estimation: `lastApiCost`, `estimatedTotalCost`.
    -   **Advanced API Settings**:
        -   `temperature`, `maxTokens`, `topP`, `topK`, `frequencyPenalty`, `presencePenalty`.
        -   Enable/disable toggles for each advanced setting.
        -   `reasoningState`: Controls the reasoning mode ('off', 'default', 'on').
    -   **UI State**:
        -   `isAdvancedSettingsOpen`: A boolean to control the visibility of the advanced settings modal.
-   **Actions**: The store defines setter functions to update the state (e.g., `setCsvData`, `setApiKey`, `setTemperature`, `setIsAdvancedSettingsOpen`).
    -   `setProcessedResults`: In addition to setting `processedResults`, this action derives `individualResponses` and updates the `uploadedCsv` in IndexedDB with the new results.
    -   `setIndividualResponse`: Updates a single row's response in `individualResponses` and also updates the `Result` field for the corresponding row in the `uploadedCsv` in IndexedDB.
-   **Persistence**:
    -   `loadInitialData`: Retrieves state from IndexedDB on application startup.
    -   `clearAllData`: Clears all data from IndexedDB and resets the application state to its initial values.

## Component-Specific Instructions

Components use the `useStore` hook to access and update the state directly.

### `ApiPanel.tsx`

-   **Purpose**: Manages API settings, triggers test API calls, and opens the advanced settings modal.
-   **Interaction with Store**: Reads API configuration and advanced settings from the store. Dispatches actions to update settings, API call status, and the visibility of the advanced settings modal (`isAdvancedSettingsOpen`).

### `EstimateCostPanel.tsx`

-   **Purpose**: Estimates the cost for a single API call and for processing the entire CSV file.
-   **Interaction with Store**: Reads `lastApiCost` and `estimatedTotalCost` from the store to display cost information.

## Development Workflow

1.  **Understand the Goal**: Read the user's request.
2.  **Explore the Code**: Use `ls` and `read_files`. Check `src/state/store.ts` for state structure.
3.  **Formulate a Plan**: Create a step-by-step plan.
4.  **Implement Changes**: Use `replace_with_git_merge_diff` to apply changes.
5.  **Verify**: Read the file back after modification.
6.  **Submit**: Use `submit` with a descriptive message.

## E2E Testing

This project uses Playwright for end-to-end testing.

-   **Test files**: `tests/`
-   **Configuration**: `playwright.config.ts`
-   **Running tests**: `npx playwright test`
-   **Viewing report**: `npx playwright show-report`