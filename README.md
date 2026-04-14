make a comparison website!
[x] login with google
[~] on the graph there are labeled x/y axis (one word at each end)
[x] you can see everyone else who has logged in on this site
[x] you see everyone's placements after you place
[x] you can "fix" other people's placements
[x] create new comparison graphs
[x] multi-dimension support: plots can have 1-3 dimensions (each with neg/pos labels)
  - stored as `dimensions` array on comparisons, `values` array on placements/fixes
  - 1D: horizontal line with fish placed along it
  - 2D: standard quad chart, single-quadrant mode when only 1 label per axis
  - 3D: isometric projection showing all 3 axes at once (dim0→bottom-right, dim1→up, dim2→bottom-left)
  - for 2D+: ← → arrows / swipe to cycle active placement pair
  - backward compat: old 2-dim plots use xLabel/yLabel fields, projected to dims[0]/dims[1]


 ┌────────────────────────────┐                                ┌───┐
 │ seriousness x silliness  v │                                │: 3│
 ┌────────────────────────────┐                                └───┘
 │ misc other comparison      │
 │                            │
 │                            │    │
 │                            │    │
 │                            │    │
 │                            │    │
 │ ┌────────────────────────┐ │    │                    ┌───┐
 │ │    + NEW COMPARISON    │ │    │                    │: 3│
 │ └────────────────────────┘ │    │      ┌───┐         └───┘
 └────────────────────────────┘    │      │: O│
                                   │      └───┘
                                   │
    ─────────────────────────────────────────────────────────────────
                                   │
                                   │
                                   │
                                   │
                                   │
                                   │
                                   │
                                   │
