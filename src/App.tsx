/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LearningOS, AppErrorBoundary } from "./components/learning-os/app";

export default function App() {
  return (
    <AppErrorBoundary>
      <LearningOS />
    </AppErrorBoundary>
  );
}
