type ToolColor = { r: number; g: number; b: number; a: number }
type Params = { width: number; height: number; gradient: "A + C" | "B + D" | "C + E" | "D + F" | "E + G" | "F + A" | "G + B" }
type Attachment = { version: 1; params: Params; state: unknown | null }
type RunMsg =
  | { type: 'action'; id: string; params: Partial<Params> }
  | { type: 'resize'; height: number }
  | { type: 'ready' }
const TOOL_ID = "6812c26e-05c8-4df7-916a-c6c5e22376db"
const DISPLAY_NAME = "Toloka gradients"
const ATTACH_KEY = TOOL_ID + ':state'
const DEFAULTS: Params = { width: 400, height: 400, gradient: "A + C" }
let latestParams: Params = DEFAULTS
let isExecuting = false

function finiteNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' && typeof value !== 'string') return fallback
  if (typeof value === 'string' && value.trim() === '') return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeParams(input: Partial<Params> | null | undefined): Params {
  const value = input ?? {}
  return {
    width: clamp(finiteNumber(value.width, DEFAULTS.width), 50, 4000),
    height: clamp(finiteNumber(value.height, DEFAULTS.height), 50, 4000),
    gradient: (String(value.gradient) in GRADIENT_MAP) ? (String(value.gradient) as Params['gradient']) : DEFAULTS.gradient,
  }
}

function placeNodeCentered(node: SceneNode, point: { x: number; y: number }): void {
  const positioned = node as SceneNode & { x: number; y: number; width: number; height: number }
  positioned.x = point.x - positioned.width / 2
  positioned.y = point.y - positioned.height / 2
}

function solidPaint(color: ToolColor): SolidPaint {
  return {
    type: 'SOLID',
    color: { r: color.r, g: color.g, b: color.b },
    opacity: color.a,
  }
}

function paintWithOpacity(paint: SolidPaint, opacity: number): SolidPaint {
  return { ...paint, opacity }
}

function htmlEscapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function uniqueSceneNodes(nodes: readonly SceneNode[]): SceneNode[] {
  return [...new Set(nodes)].filter((node) => !node.removed)
}

function attachRelaunch(nodes: readonly SceneNode[]): void {
  const unique = uniqueSceneNodes(nodes)
  if (unique.length > 0) {
    for (const node of unique) node.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME })
  } else {
    figma.root.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME })
  }
}

function singleSelectedTarget(): SceneNode | null {
  const selection = figma.currentPage.selection
  return selection.length === 1 ? (selection[0] ?? null) : null
}

function readAttachment(node: SceneNode): Attachment | null {
  try {
    const parsed = JSON.parse(node.getPluginData(ATTACH_KEY)) as Partial<Attachment>
    if (parsed?.version !== 1) return null
    return {
      version: 1,
      params: normalizeParams(parsed.params),
      state: (parsed.state ?? null) as unknown | null,
    }
  } catch {
    return null
  }
}

function writeAttachment(node: SceneNode, params: Params, state: unknown | null): void {
  node.setPluginData(ATTACH_KEY, JSON.stringify({ version: 1, params, state }))
}

const GRADIENT_MAP: Record<Params['gradient'], [number, number]> = {
  'A + C': [0, 2],
  'B + D': [1, 3],
  'C + E': [2, 4],
  'D + F': [3, 5],
  'E + G': [4, 6],
  'F + A': [5, 0],
  'G + B': [6, 1],
}

function hexColor(hex: string): ToolColor {
  const value = parseInt(hex, 16)
  return {
    r: ((value >> 16) & 0xff) / 255,
    g: ((value >> 8) & 0xff) / 255,
    b: (value & 0xff) / 255,
    a: 1,
  }
}

// A–G palette
const PALETTE: ToolColor[] = [
  hexColor('FFF7CC'), // A
  hexColor('E0FFCC'), // B
  hexColor('CEF0FD'), // C
  hexColor('E0D7F4'), // D
  hexColor('FBD0EB'), // E
  hexColor('FFCDCC'), // F
  hexColor('FFE9CC'), // G
]

function evaluateEnabled_generate(_selection: readonly SceneNode[]): boolean {
  return true
}
function actionTarget_generate(): SceneNode | null {
  const selection = figma.currentPage.selection
  if (!evaluateEnabled_generate(selection)) return null
  return selection.length >= 1 ? (selection[0] ?? null) : null
}
async function action_generate(params: Params, target: SceneNode | null, _previousState: unknown | null): Promise<{ affectedNodes: SceneNode[]; state: unknown | null }> {
  const affectedNodes: SceneNode[] = target != null ? [target] : []
  const w = params.width
  const h = params.height
  const shortSide = Math.min(w, h)
  const padding = shortSide * 0.125

  const pair = GRADIENT_MAP[params.gradient] ?? [0, 2]
  const color1Val = PALETTE[pair[0]]
  const color2Val = PALETTE[pair[1]]

  const frame = figma.createFrame()
  frame.name = 'Toloka gradient ' + params.gradient
  frame.resize(w, h)
  frame.clipsContent = true
  frame.fills = []

  const rect1 = figma.createRectangle()
  rect1.name = 'Color 1'
  rect1.resize(w, h)
  rect1.fills = [solidPaint(color1Val)]
  frame.appendChild(rect1)
  rect1.x = 0
  rect1.y = 0

  const whiteW = w - padding * 2
  const whiteH = h - padding * 2
  const whiteRect = figma.createRectangle()
  whiteRect.name = 'White'
  whiteRect.resize(Math.max(1, whiteW), Math.max(1, whiteH))
  whiteRect.fills = [solidPaint({ r: 1, g: 1, b: 1, a: 1 })]
  frame.appendChild(whiteRect)
  whiteRect.x = padding
  whiteRect.y = padding

  const c2W = whiteW - padding * 2
  const c2H = whiteH - padding * 2
  const rect2 = figma.createRectangle()
  rect2.name = 'Color 2'
  rect2.resize(Math.max(1, c2W), Math.max(1, c2H))
  rect2.fills = [solidPaint(color2Val)]
  frame.appendChild(rect2)
  rect2.x = padding + padding
  rect2.y = padding + padding

  const blurRect = figma.createRectangle()
  blurRect.name = 'Blur'
  blurRect.resize(w, h)
  blurRect.fills = [paintWithOpacity(solidPaint({ r: 1, g: 1, b: 1, a: 1 }), 0.01)]
  blurRect.effects = [{ type: 'BACKGROUND_BLUR', radius: shortSide * 0.33333, visible: true, blurType: 'NORMAL' } as BlurEffect]
  frame.appendChild(blurRect)
  blurRect.x = 0
  blurRect.y = 0

  placeNodeCentered(frame, figma.viewport.center)
  affectedNodes.push(frame)
  return { affectedNodes, state: null }
}
async function runAction_generate(target: SceneNode | null, notify: boolean): Promise<void> {
  isExecuting = true
  try {
    const result = await action_generate(latestParams, target, null)
    const created = result.affectedNodes.filter((node) => node !== target)
    for (const node of created) writeAttachment(node, latestParams, result.state)
    attachRelaunch(created)
    pushActionStates()
    if (notify) {
      if (created.length > 0) {
        if (target == null) figma.currentPage.selection = created
        figma.viewport.scrollAndZoomIntoView(created)
      }
      figma.notify(DISPLAY_NAME + " ran")
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    figma.notify(message, { error: true })
  } finally {
    isExecuting = false
  }
}


function pushActionStates(): void {
  const enabled_generate = evaluateEnabled_generate(figma.currentPage.selection)
  figma.ui.postMessage({
    type: 'action-state',
    actions: {
      "generate": { enabled: enabled_generate, label: "Generate", status: undefined },
    },
  })
}
function refreshSelection(): void {
  if (isExecuting) return
  const target = singleSelectedTarget()
  const attachment = target != null ? readAttachment(target) : null
  if (attachment != null) {
    latestParams = attachment.params
    figma.ui.postMessage({ type: 'params-change', params: latestParams })
  }
  pushActionStates()
}

const initialTarget = singleSelectedTarget()
const initialAttachment = initialTarget != null ? readAttachment(initialTarget) : null
const initialParams: Params = initialAttachment?.params ?? DEFAULTS
latestParams = initialParams
let html = __html__
html = html.replace(/(id="width"[^>]*\bvalue=")[^"]*(")/g, '$1' + htmlEscapeAttribute(String(initialParams.width)) + '$2')
html = html.replace(/(id="height"[^>]*\bvalue=")[^"]*(")/g, '$1' + htmlEscapeAttribute(String(initialParams.height)) + '$2')
html = html.replace(/<select id="gradient">[\s\S]*?<\/select>/, (block) => {
  const stripped = block.replace(/ selected(?=[\s>])/g, '')
  const optionPattern = new RegExp('(<option value="' + escapeRegExp(htmlEscapeAttribute(initialParams.gradient)) + '")')
  return stripped.replace(optionPattern, '$1 selected')
})
figma.root.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME })
figma.showUI(html, { width: 280, height: 320, themeColors: true })
figma.on('selectionchange', refreshSelection)

figma.ui.onmessage = (msg: RunMsg) => {
  if (msg.type === 'ready') {
    // UI's message listener is attached now — safe to send state it can't miss
    pushActionStates()
    figma.ui.postMessage({ type: 'colors', colors: PALETTE, gradientMap: GRADIENT_MAP })
    return
  }
  if (msg.type === 'resize') {
    figma.ui.resize(280, Math.max(120, Math.min(900, Math.round(msg.height))))
    return
  }
  if (msg.type === 'action') {
    if (msg.id === "generate") {
      const target = actionTarget_generate()
      latestParams = normalizeParams(msg.params)
      void runAction_generate(target, true)
      return
    }
    return
  }
}
