### Issue 1: Add Loading Indicator to Main Page

**Description**
Currently, when the main page loads, there is no visual loading indicator to inform the user that data is being fetched. This may cause confusion, as users might think the page is not working.
**Tasks:**

* Add a loading component at the start of the main page rendering process.
* Remove the loading indicator as soon as the content is ready for interaction.

**Type:** enhancement

---

### Issue 2: Fix View Mode Switching for Project, User, and Indicator Charts

**Description**
When changing the view mode, the action only works for the beeswarm chart. The view mode is not switching correctly for the project, user, and indicator charts.
**Tasks:**

* Investigate why view mode switching does not work for these charts.
* Ensure all view modes are available and functional for project, user, and indicator charts.

**Type:** bug

---

### Issue 3: Add Loading Indicator When Switching View Modes

**Description**
When the user switches the view mode, there is no loading indication, which may cause uncertainty if the switch actually occurred.
**Tasks:**

* Add a loading indicator while the new view mode is being processed and rendered.
* Remove the indicator once rendering is complete.

**Type:** enhancement

---

### Issue 4: Add Loading Indicator When Switching Projects

**Description**
When selecting a new project, there is no visual indicator that the loading is in progress.
**Tasks:**

* Implement a loading component whenever a new project is selected.
* Ensure the loading indicator is removed after the new project's data is loaded.

**Type:** enhancement

---

### Issue 5: Filter Nodes by Selected Node Colors

**Description**
Currently, when selecting node colors, all nodes are still being processed and rendered. The expected behavior is to show only nodes with the selected colors, and nodes that are not selected should not be processed at all.
**Tasks:**

* Update the filtering logic to process and display only the nodes with the selected colors.
* Ensure that the graph renders only with the filtered data.

**Type:** enhancement

---

### Issue 6: Fix Narrow Canvas Width in Interaction Network

**Description**
When the interaction network is rendered, the canvas appears too narrow, which impacts usability and visibility.
**Tasks:**

* Investigate and fix the canvas width to ensure it occupies the correct space on the screen.
* Test on different screen sizes to ensure responsiveness.

**Type:** bug

---