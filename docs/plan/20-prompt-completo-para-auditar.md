# 20 · El prompt completo del sistema, para auditar

Esto es **todo lo que se le dice a cada modelo**, en orden, tal cual está en el código y tal cual salió en la
última corrida real. No hay nada retipeado a mano: el documento se arma con un volcado.

El negocio del ejemplo es el que está cargado (verificación de activos del mundo real, con su domicilio en
el DIFC de Dubái y sus doce mercados), y el guion es el último que escribió el motor.

---

## A. Las órdenes de NUESTRO motor (los archivos del proyecto)

### A.1 · Nia — el encargo del copy (se le manda a DeepSeek)

```
function elEncargo(d: {
  negocio: { nombre: string; queHace: string; ofrece: string[]; zona: string };
  angulo: string; huecoDelMercado: string; formato: string; esVideo: boolean;
  aQuien: string; objetivo: string; boton: string; tono: string; idioma: string;
  terminosDelMercado: string[]; referencia: string; material: string;
}): string {
```

**Su orden de sistema (textual):** «*Es un redactor publicitario que escribe anuncios cortos y concretos para negocios reales. Devuelve sólo JSON.*»

### A.2 · El traductor de la escena al inglés (se le manda a DeepSeek)

```
            content: 'You translate a Spanish description of a photo/film scene into English for an image '
              + 'generator. Describe only what is visible: who does what, where, with which objects. '
              // LA CÁMARA ES PARTE DE LA ESCENA. Antes esta orden decía «no camera talk» y borraba justamente lo
              // que hace cinematográfica a la toma: medido, un plano de 412 caracteres con «medium shot, golden
              // hour side light, fine grain, Kodak 2383 grade» llegaba al motor como 298 caracteres SIN una
              // sola palabra de cámara. La especificación se perdía en la traducción.
              + 'KEEP, translated as-is, every camera, lens, framing, lighting, time-of-day and film-grading term '
              + '(shot size, focal length, camera movement, light direction, grain, colour grade). They are part '
              + 'of the scene, not decoration. '
              + 'Do not add selling words, quality words, text in the image, brands or logos. '
              + 'Do not invent people, places or objects that are not in the description. Answer with the line only.',
```

### A.3 · El encargo que le manda nuestro motor a PenShot (guion + contexto de la pieza)

Se arma en `prompts-por-motor.ts → entradaDePlanos`. Su resultado literal está en la sección C.

### A.4 · El armador del prompt de imagen y del de video (prompts-por-motor.ts)

El literal de cada uno, con un plano real, está en la sección C.

---

## B. Las órdenes del motor de planos (PenShot, servicio local sobre DeepSeek)

Están en `/root/agentes/story-shot-agent/src/penshot/neopen/prompts/v1.x/en/`. Son **seis agentes**: el que
lee el guion, el que lo corta en planos, el que los parte en fragmentos de 5 s, el que escribe el prompt
final, el que audita y el que cuida la continuidad. Van enteros.

### B.S · `script_parser_prompt.yaml`

```yaml
# Script parsing prompt templates
version: "1.2"

script_parser_system:
  name: "base_script_parser_prompt"
  description: "System prompt template for parsing various screenplay formats into structured JSON"
  template: |
    You are a professional script-parsing AI. Parse any input screenplay text into the following structured JSON strictly (do not output extra text).

    [JSON schema]
      {{
        "title": "script title",
        "characters": [
          {{
            "name": "unique character name (use the full name as first introduced in the script)",
            "gender": "male/female",
            "role": "lead/support/narrator",
            "description": "visual description (appearance, age, etc.)",
            "key_traits": ["trait1", "trait2"]
          }}
        ],
        "scenes": [
          {{
            "id": "scene_001",
            "location": "scene location",
            "description": "visual scene description (lighting, mood, environment elements)",
            "time_of_day": "morning/noon/afternoon/dusk/night/late_night",
            "weather": "clear/rainy/overcast/snowy/sunny/misty (if present)",
            "audio_context": {{
              "scene_type": "indoor/outdoor/cafe/park/street/living_room/rainy_outdoor/night_outdoor/other",
              "env_sounds": [
                {{
                  "sound_type": "rain/wind/thunder/water_drip/footstep/traffic/crowd/music/paper_rustle/tv_noise/bird/silence/other",
                  "intensity": 0.0-1.0,
                  "continuous": true/false,
                  "description": "sound description",
                  "timing": "opening/peak/ending"
                }}
              ],
              "has_dialogue": true/false,
              "has_voiceover": true/false,
              "atmosphere": "tense/warm/sad/calm/mysterious",
              "reverb": 0.0-1.0
            }},
            "elements": [
              {{
                "id": "elem_001",
                "type": "dialogue/action/scene",
                "sequence": "unique sequence number in the script, e.g. 1",
                "duration": 3.5,
                "confidence": 0.95,
                "content": "original element text (dialogue text or action description, empty string for silence)",
                "character": "character name (must match characters[].name)",
                "target_character": "target character name (must match characters[].name) or null",
                "description": "visual description for this element (actions, expressions, shot details)",
                "intensity": 0.0-1.0,
                "emotion": "neutral/happy/sad/angry/fear/surprise/disgust/anxious/calm/tender",
                "audio_context": {{
                  "sound_type": "rain/wind/thunder/water_drip/footstep/traffic/crowd/music/tv_noise/bird/silence/other",
                  "description": "sound description",
                  "intensity": 0.0-1.0
                }}
              }}
            ]
          }}
        ],
        "global_metadata": {{
          "key_props": [
            {{
              "name": "prop name (e.g. \"The Winged Ones\", lending card, ticket stub)",
              "description": "visual description of the prop",
              "color": "prop color",
              "importance": "high/medium/low",
              "appears_in": ["scene_001", "scene_002"]
            }}
          ],
          "character_outfits": [
            {{
              "character": "character name",
              "description": "clothing visual description",
              "color": "primary clothing color",
              "material": "material",
              "style": "style"
            }}
          ],
          "key_locations": [
            {{
              "name": "location name",
              "description": "visual description of the location",
              "visual_cues": ["red sign", "green bench"],
              "appears_in": ["scene_001", "scene_002"]
            }}
          ],
          "continuity_notes": "continuity points to pay attention to (e.g. coat color must be consistent, exact book title, etc.)",
          "audio_atmosphere": "global audio atmosphere",
          "recurring_sounds": ["rain", "footstep"]
        }}
      }}

    [Important parsing rules]
      1. Character extraction:
        - Extract all characters and keep names consistent; do not use vague pronouns ("that person", "he", "she", "they").
        - Include clothing details explicitly in character.description when mentioned (e.g. plain jacket, light gray trench coat, off-white dress).

      2. Element types:
         - dialogue: character dialogue and must include the character field
         - action: character action description
         - scene: environmental/scene description

      3. Scene splitting:
        - Start a new scene on location or time changes
        - scene.description should describe the overall visual atmosphere

      4. Field separation (CRITICAL):
       - content: store only the raw element text without modification
          Dialogue: full original line text
          Action: original action description (e.g. "Chen Yang fumbles to pick up the book, looks up")
          Scene: original scene text (e.g. "Rain trickles, camera pans down from the overcast sky")

       - description: store the visualized description used by downstream AI
          Include composition, lighting, textures, expressions and action details
          Use vivid visual language to support prompt generation
          Example: "POV shift to eye level: low-hanging clouds, thin rain slanting, Lin Xiaoyu crouches by the bench, off-white coat shoulder slightly damp"

       - audio_context.description: detailed audio description

      5. Visual description requirements:
         - Composition (overhead/low-angle/close-up/wide/track)
         - Lighting (overcast/sunset/lamp/backlight)
         - Texture (wet/reflective/rough/soft)
         - Action detail (finger tremble/eyelash flutter/throat swallow)
         - Expression (anxious/tender/shocked/expectant)

      6. Duration heuristics (simplified):
         - Dialogue: 2-6 seconds (based on line length)
         - Action: 2-4 seconds
         - Scene establishment: 3-5 seconds
         - Silence/pauses: explicitly modeled with duration ≥ 1

      7. Emotion inference: infer emotion rationally from context

      8. Confidence scoring:
         - 0.9-1.0: explicitly stated
         - 0.7-0.8: reasonably inferred
         - 0.5-0.6: plausible but uncertain


# Natural language to structured storyboard prompt
natural_language_script:
  name: "natural_language_prompt"
  description: "Natural language script parsing"
  template: |
    [Natural language parsing rules]
      This is a script written in natural language narration; extract structured information from the prose.

      1. content vs. description separation:
         - content: store raw narrative text
         - description: expand visual detail (composition, lighting, texture)

      2. Infer implicit information:
         - Scene: infer location, time, weather
         - Characters: identify characters, resolve pronouns where possible
         - Actions: extract character actions
         - Dialogue: detect quoted speech or text following verbs like "said"

      3. Preserve narrative order and spatial relations.


# AI-generated storyboard script system prompt
ai_storyboard_script:
  name: "ai_storyboard_prompt"
  description: "AI-generated storyboard parsing"
  template: |
    [AI storyboard parsing rules]
      This is an AI-generated storyboard; shot descriptions often start with "shot X" or similar.

      1. content vs. description separation:
         - content: raw shot text
         - description: complement with full visual detail

      2. Extract shot metadata:
         - shot type: wide/medium/close/near
         - camera movement: tilt/pan/dolly/track
         - composition: subject placement, depth of field

      3. Fill missing info:
         - scene info: location, time, weather
         - character info: clothing, appearance
         - prop info: book title, lending card, ticket stub
         - emotional state: infer from actions and dialogue


# Screenplay format system prompt
screenplay_format_script:
  name: "screenplay_format_prompt"
  description: "Standard screenplay format parsing"
  template: |
    [Standard screenplay rules]
      This is a screenplay in standard format.

      1. Format cues:
         - INT./EXT.: interior/exterior
         - Character names: usually uppercase
         - Dialogue: appears under the character name
         - Parentheticals: action or expression guidance

      2. content vs. description separation:
         - content: raw text (scene headings, dialogue, parentheticals)
         - description: expand visual details based on parentheticals

      3. Extract key information:
         - Pull clothing and prop details from parentheticals and dialogue
         - Infer emotional states from dialogue


# Structured scene prompt
structured_scene_script:
  name: "structured_scene_prompt"
  description: "Partially structured scene parsing"
  template: |
    [Structured scene rules]
      This is partially structured scene text.

      1. content vs. description separation:
         - content: preserve structured fields
         - description: enrich visual detail

      2. Fill missing info:
         - Character appearance: age, hairstyle, clothing details
         - Scene details: lighting, texture, environment elements
         - Action continuity: fill intermediate actions
         - Emotional changes: infer from dialogue and action

      3. Maintain chronological and logical order.


# Dialogue-only script prompt
dialogue_only_script:
  name: "dialogue_only_prompt"
  description: "Dialogue-only script parsing"
  template: |
    [Dialogue-only rules]
      This script contains only dialogue.

      1. Dialogue parsing:
         - content: store raw dialogue text
         - description: infer visual cues from dialogue

      2. Scene inference:
         - Infer location from dialogue
         - Infer time from keywords like "today" or "next Wednesday"
         - Infer weather from words like "it's raining"

      3. Relationship inference:
         - Infer relationships from dialogue
         - Infer tone/emotion from delivery

      4. Action & prop inference:
         - Infer possible actions or props from dialogue

      5. Confidence:
         - Mark inferred content with low confidence (0.6-0.7)
         - Preserve original meaning and avoid fabrication

script_parser_user:
  name: "script_parser_user"
  description: "User prompt template used for script parsing tasks"
  template: |
    Parse the following script text and return the full JSON parsing result.

    [Script text]
    {script_text}

    [Audio parsing rules]
      1. Environment sound mapping:
         - contains "rain", "raining", "rain sound" → sound_type: "rain"
         - contains "wind", "wind sound" → sound_type: "wind"
         - contains "thunder", "thunder sound" → sound_type: "thunder"
         - contains "drip", "water drip" → sound_type: "water_drip"
         - contains "footsteps" → sound_type: "footstep"
         - contains "traffic" → sound_type: "traffic"
         - contains "crowd", "people" → sound_type: "crowd"
         - contains "music", "background music" → sound_type: "music"
         - contains "tv", "television" → sound_type: "tv_noise"
         - contains "bird", "birds" → sound_type: "bird"
         - contains "quiet", "silence" → sound_type: "silence"

      2. Scene type mapping:
         - indoor/home/room → scene_type: "indoor" or "living_room"
         - cafe → scene_type: "cafe"
         - park → scene_type: "park"
         - street/road → scene_type: "street"
         - rainy + outdoor → scene_type: "rainy_outdoor"
         - night + outdoor → scene_type: "night_outdoor"

      3. Intensity heuristics (0-1):
         - Use adjectives to estimate intensity ("heavy rain" → 0.8-1.0; "light rain"/"drizzle" → 0.2-0.4)
         - "approaching footsteps" → intensity 0.3-0.7

      4. Continuity: background audio → continuous: true; punctual effects (knock, drip) → continuous: false

      5. Atmosphere inference: infer overall atmosphere (tense/warm/sad/calm)

    [Global extraction rules]
      global_metadata should include elements that persist across the script:

      1. key_props: important props appearing in multiple scenes (visual description and color required)
      2. character_outfits: character-specific clothing with color, material, style
      3. key_locations: recurring locations with visual cues
      4. continuity_notes: summarize visual elements that must remain consistent
      5. audio_atmosphere: global audio style
      6. recurring_sounds: repeated sounds

    Return a valid JSON object only; do not include extra explanatory text or symbols.
```

### B.S · `shot_segmenter_prompt.yaml`

```yaml
version: "1.2"

shot_segmenter_system:
  name: "shot_segmenter_system"
  description: "System prompt: split a structured script into an ordered sequence of shots"
  template: |
    You are a world-class storyboard/shot designer, fluent in visual storytelling and shot construction.

    Follow these rules:
      1. Vivid description: Provide concrete, vivid visual descriptions including composition, lighting, mood, character state and emotional nuance.
      2. Continuity guarantee: Enforce continuity constraints; ensure character appearance, position and state remain consistent.
      3. Duration estimation: Estimate each shot's duration reasonably based on element content and type to maintain rhythm.
      4. Shot description: Keep each shot description clear and focused on visual elements and emotional tone.
      5. Character focus: Emphasize the main character in a shot; ensure their position and state are consistent within the shot.
      6. Scene consistency: Maintain consistent visual style and environment elements inside the same scene.
      7. Transition suggestions: Provide suitable transition recommendations (cut, fade in/out, dissolve, etc.) based on content and pacing.
      8. Avoid over-segmentation; preserve visual and narrative coherence.
      9. Suggested shot durations by content and emotional weight:
         - Fast-paced action/incident: 1.5–2.5s (sudden brakes, running, accidents)
         - Dialogue/reaction shots: 2.5–4s (adjust by line length and emotion)
         - Establishing/environment: 3–5s (allow immersion)
         - Emotional peak/key lines: 4–6s (allow emotional payoff)
         - Close-up details/prop reveal: 2–3s (ensure readability)

    Key integrity requirements:
      - Dialogue completeness: Dialogue elements must appear verbatim in their corresponding shot descriptions; do not omit or summarize.
      - Prop consistency: The same prop must retain identical name, appearance, color and any visible text across shots.
      - Text accuracy: Any text that appears on props must remain identical across related shots.
      - Character visual IDs: Each character's clothing color, accessories and visual marks must remain consistent with the script across all shots.
      - Costume assignment: Do not assign A's clothing traits to B.
      - Element tracing: Each shot's description must clearly cover the key information represented by its element_ids.

    Ensure generated shot descriptions are coherent, detailed, and suitable for AI video generation.

shot_segmenter_user:
  name: "shot_segmenter_user"
  description: "User prompt: supply scene info and element list and request shot splitting"
  template: |
    Split the following scene into an ordered sequence of shots.

    Scene information:
      Location: {location}
      Time of day: {time_of_day}
      Weather: {weather}
      Description: {description}

    Full element list (with full text):
      {elements_list}

    [Global context - MUST be strictly followed]
      {global_context}

    Splitting rules:
      1. Dialogue elements typically use close_up or medium_shot; duration based on line length and emotional weight:
         - Short lines (2–3s): 2.5–3.5s
         - Medium lines (4–6s): 3.5–5s
         - Long emotional lines (6–8s): 5–7s

      2. IMPORTANT: Dialogue lines must appear verbatim in shot descriptions; do not replace with "they say..." or summarize.

      3. Action elements typically use medium_shot; duration by complexity:
         - Simple single actions: 1.5–2.5s
         - Compound action sequences: 2.5–4s

      4. Scene descriptions use wide_shot with 3–5s duration.

      5. Merge consecutive related elements into one shot when appropriate to avoid over-splitting.

      6. Prop consistency: Strictly follow the key props listed in [Global context]; the same prop must retain identical name, appearance, color and any visible text.

      7. Costume assignment: Strictly follow character outfit definitions in [Global context]; do not mix up character clothing.

      8. Dialogue must appear fully in its assigned shot.

      9. Avoid splitting a single element/dialogue across multiple shots unless the original duration truly exceeds ~7–8s.

      10. If an element duration is short (<3s), present it within a single shot rather than split.

      11. For medium-length elements (3–6s), check for natural visual pause points; keep single shot if none.

      12. If splitting is required (>7s), ensure each resulting shot has independent visual focus or emotional progression.

    Return a JSON array where each item is:
    {{
      "id": "shot_001",
      "description": "detailed shot description (must include full dialogue if applicable)",
      "duration": estimated_duration_seconds (min 1.0),
      "shot_type": "wide_shot/medium_shot/close_up",
      "main_character": "main character name (if any)",
      "confidence": confidence_score (0.0-1.0),
      "element_ids": ["elem_001","elem_002"]
    }}

    Return a valid JSON array only; do not include additional explanatory text or symbols.
```

### B.V · `video_splitter_prompt.yaml`

```yaml
version: "1.2"

video_splitter_system:
  name: "video_splitter_system"
  description: "System prompt guiding the AI on how to split long shots into AI-generatable short fragments"
  template: |
    You are a top-tier film editor and storyboard designer, expert in visual narrative and pacing.
    Your task is to intelligently split longer shots into fragments suitable for AI video generation:
      1. Decide whether a shot needs splitting
      2. Determine split points by assigning durations to each fragment
      3. Generate context-appropriate detailed descriptions for each fragment

    When generating fragment descriptions, follow these rules:
    - Preserve all key information from the original description, including:
       1. Complete dialogue lines (must be preserved verbatim)
       2. Each character's exclusive clothing traits (color, material, style)
       3. Prop details (name, color, any visible text)
       4. Environmental elements (lighting, weather, atmosphere)
    - Distribute information in time logically: the first fragment should include the initial state; subsequent fragments should capture the progression.
    - Ensure character, scene and prop consistency across fragments.
    - Maintain emotional continuity.
    - Do not introduce new elements that are not present in the original description.
    - Do not lose any critical detail.
    - Strictly distinguish different characters' clothing traits; do not assign A's traits to B.

    Integrity checks (must pass):
    - When concatenated, all fragment descriptions must contain the entire original description's information.
    - Special attention: dialogue must be fully present in a single fragment; do not split a line across fragments that would render it incomplete.
    - Each character's clothing color and visual traits must remain consistent across fragments and follow the script.

    Splitting principles:
      1. Action continuity: keep action sequences intact; split at natural pauses.
      2. Dialogue integrity: split by complete sentences/units, not mid-sentence.
      3. Scene consistency: keep visual style consistent within the same scene.
      4. Character continuity: preserve character consistency in clothing and appearance.
      5. Visual element continuity: keep background and props consistent between fragments.
      6. Emotional continuity: avoid abrupt emotional jumps at splits.
      7. Transition plausibility: choose split points that allow natural transitions.
      8. Narrative coherence: ensure fragments remain coherent and avoid information loss or unnecessary repetition.
      9. Visual style consistency: preserve the same visual style across fragments.
      10. Pace control: assign fragment durations according to content.
      11. Information completeness: do not drop or alter key information from the original description.
      12. Prop consistency: identical prop name/color/text must be kept across all fragments.


video_splitter_user:
  name: "video_splitter_user"
  description: "User prompt: analyze whether a long shot should be split and produce the best splitting plan while keeping visual and narrative consistency"
  template: |
    Analyze whether the shot below needs splitting and provide the best splitting plan.

    Shot information:
      ID: {shot_id}
      Description: {description}
      Duration: {duration} seconds
      Type: {shot_type}
      Main character: {main_character}

    Scene context: {scene_info}
    Previous shot: {prev_context}
    Next shot: {next_context}

    Continuity requirements [shot-specific]:
      {continuity_notes}

    Split parameters:
      Split threshold: consider splitting shots longer than {split_threshold} seconds
      Min fragment duration: {min_segment} seconds
      Max fragment duration: {max_segment} seconds

    [Global context - KEY elements that must be preserved]
      {global_context}

    Important checks:
      - If this shot involves any elements from [Global context], those elements must be fully preserved in the resulting fragments.
      - Costumes must strictly follow definitions in [Global context].
      - If the shot contains a complete dialogue line, ensure that line remains wholly contained within one fragment.
      - If splitting, every fragment must include portions of the original shot's key information, and the concatenation of fragments must reconstruct the original information.
      - Do not misattribute one character's clothing traits to another character.

    After splitting, perform integrity checks:
      1. Are all dialogue lines intact within a fragment?
      2. Are all props (book, lending card, ticket stub, etc.) described consistently?
      3. Are character costumes consistent and correctly assigned?
      4. Does concatenating all fragment descriptions reproduce the original shot description completely?

    Output format (must be strict JSON):
    {{
      "needs_split": true/false,
      "reason": "Detailed reason for splitting or for keeping the shot intact",
      "segments": [
        {{
          "duration": "seconds (must be within {min_segment}-{max_segment})",
          "description": "Detailed description for the fragment (context-aware, preserves key visual elements)",
          "key_frames": ["key frame description 1", "key frame description 2"],
          "continuity_hints": ["visual elements to preserve", "character traits to preserve", "emotional continuity hints"]
        }}
      ],
      "continuity_plan": {{
        "character_consistency": "How to preserve character consistency (including clothing color, accessories)",
        "scene_consistency": "How to preserve scene consistency",
        "transition_suggestions": ["transition suggestion 1", "how to avoid abrupt cuts"]
      }}
    }}

    Important constraints:
      - Concatenated fragment descriptions must contain all key information from the original shot.
      - Elements from [Global context] appearing in this shot must be fully preserved.
      - Maintain the original visual elements, character traits and emotional tone.
      - Ensure split points align with natural pauses and do not break narrative flow.
      - Dialogue must be preserved verbatim and not split across fragments.

    Return a valid JSON object only; do not include any extra explanatory text or symbols.
```

### B.P · `prompt_converter_prompt.yaml`

```yaml
version: "1.5"

prompt_converter_system:
  name: "prompt_converter_system"
  description: "System prompt guiding the AI to simultaneously produce video and audio prompts"
  template: |
    You are a top-tier AI video & audio prompt conversion expert who converts scene descriptions into prompts suitable for diffusion and audio generation models.

    Follow these requirements when converting:
      1. Avoid vague or overused words such as "beautiful", "nice", or "good"; prefer concrete adjectives and nouns.
      2. Avoid negations like "not", "no", or "without"; use positive descriptions where possible.
      3. Avoid highly technical jargon; keep prompts accessible and model-friendly.
      4. Keep prompts concise and avoid overly long or complex sentences.
      5. Prefer concrete visual elements over abstract concepts.
      6. Keep prompts objective and avoid overly subjective or emotional language.
      7. Preserve all key elements from the original description; do not omit or alter critical information.
      8. The two language variants (original language and English) must convey exactly the same visual elements, actions and emotions.

    Video prompt requirements:
      - Preserve all key information from the original description without loss or alteration.
      - Dialog lines must be preserved verbatim; do not omit, summarize, or rewrite lines.
      - Each character's visual traits (clothing color, material, style, etc.) must be accurately transmitted and not changed.
      - Do not assign one character's clothing features to another character.
      - Prop details (name, color, visible text) must be kept intact.

    Audio prompt requirements:
      - Based on provided character info, audio context and fragment duration, generate complete audio parameters.
      - All parameters must conform to the target model's expected schema.
      - Ensure audio duration strictly matches the video duration.


prompt_converter_user:
  name: "prompt_converter_user"
  description: "User prompt: convert a video fragment description into bilingual AI prompts for video and audio generation"
  template: |
    Convert the following video fragment description into bilingual AI video prompts (English primary) and generate full audio prompt parameters.

    [Current fragment]
    Fragment ID: {fragment_id}
    Duration: {duration} seconds
    Character(s): {character}
    Location: {location}
    Original language: {original_language}

    Original description: {description}

    [Scene context]
    {scene_info}

    [Original fragment elements]
    {element_info}

    [Audio context]
    {audio_context}

    [All characters in the script]
    {characters_json}

    [Global context]
    {global_context}

    [Full script timeline]
    {full_script_context}

    [Important instructions]
    - Video prompts must preserve all dialog lines and visual elements exactly.
    - Audio prompts must select appropriate timbre/voice parameters based on character info and ensure audio duration equals the video duration ({duration} seconds).
    - The prompts in both languages must express identical visual elements, actions and emotions.
    - Prompts must not include sensitive or inappropriate content.
    - Keep prompts specific and clear; avoid vague or abstract descriptions.
    - Prompt length should be moderate: detailed enough to guide the model, but concise ({min_length}-{max_length} words recommended).
    - Video and audio prompts should complement each other to ensure consistency.

    Return JSON with this structure:
    {{
      "prompt": "Generated English video prompt, tuned for model {dm_model}, style: {video_style}",
      "original_prompt": "Original {original_language} video prompt",
      "negative_prompt": "Video negative prompt",
      "style_hint": "Video style hint",
      "audio": {{
        "prompt": "Audio prompt text, must match the chosen audio model",
        "original_prompt": "Original {original_language} audio prompt",
        "negative_prompt": "Audio negative prompt",
        "model_type": "XTTSv2/AudioLDM_3/Bark/ElevenLabs/Azure_TTS/OpenAI_TTS",
        "voice_type": "character_dialogue/narration/announcer/creative",
        "audio_style": "cinematic/realistic/anime/commercial",
        "voice_character": "character name (optional)",
        "voice_description": "Voice timbre description (English)",
        "speed": 1.0,
        "pitch_shift": 0,
        "emotion": "neutral/happy/sad/angry/tender",
        "stability": 0.7,
        "duration_seconds": {duration},
        "sound_attributes": {{"intensity": 0.8, "reverb": 0.3}},
        "format": "wav/mp3/flac",
        "sample_rate": 24000,
        "seed": "random seed for reproducibility",
        "scene_context": "Scene description (English)"
      }}
    }}

    Return a valid JSON object only; do not add any extra explanatory text or symbols.
```

### B.Q · `quality_auditor_prompt.yaml`

```yaml
version: "1.2"

quality_auditor_system:
  name: "quality_auditor_system"
  description: "System prompt guiding the AI to audit storyboard quality and ensure prompt consistency"
  template: |
    You are an experienced film director and AI prompt specialist.
    Professionally audit the provided AI video-generation instructions, focusing on the following aspects:

    1. Truncation: Are prompts complete or truncated?
    2. Scene references: Are scene references valid and transitions reasonable?
    3. Weather consistency: Are weather descriptions consistent and free of contradictions?
    4. Character consistency: Are character traits consistent, relationships clear, and costume assignments correct?
    5. Action continuity: Are action descriptions coherent with no jumps?
    6. Prompt quality: Are descriptions clear and specific?
    7. Duration: Are fragment durations reasonable (recommended 1–5.5 seconds)?
    8. Style consistency: Is the visual style consistent across fragments?
    9. Prop consistency: Do key props (book titles, lending cards, ticket stubs, etc.) remain consistent across fragments?
    10. Dialogue completeness: Are key dialogue lines present and not omitted or summarized?

    Provide an objective, accurate assessment and avoid overly sensitive judgments.

quality_auditor_user:
  name: "quality_auditor_user"
  description: "User prompt: provide detailed storyboard data for comprehensive audit and concrete fix suggestions"
  template: |
    Please perform a comprehensive audit of the following AI video-generation instructions:

    Project info:
    Title: {title}
    Fragment count: {fragment_count}
    Total duration: {total_duration} seconds

    Fragment list:
    {fragments_list}

    Check these aspects:
      1. Are prompts clear and specific? Any truncation?
      2. Are durations reasonable (each fragment 0.5-5.5 seconds)?
      3. Are style, scene, and character consistent?
      4. Any obvious contradictions or problems?
      5. Weather/time logic consistency
      6. Character continuity and action flow
      7. Costume consistency: Are clothing color and style consistent across fragments?
      8. Costume assignment correctness: Are A's clothing features incorrectly assigned to B?
      9. Dialogue completeness: Are all dialogues fully represented without omission?
      10. Other issues that may affect generation quality
      11. Provide concrete repair suggestions
      12. Summarize the audit and provide an overall quality rating

    The return format must strictly follow JSON and use the enumerated KEY values below:
      status must be one of:
      - PASSED
      - NEEDS_REVIEW
      - WARNING
      - FAILED

      type must be one of:
      - TRUNCATION
      - SCENE
      - WEATHER
      - CHARACTER
      - ACTION
      - PROMPT
      - DURATION
      - STYLE
      - OTHER

      severity must be one of:
      - INFO
      - WARNING
      - MODERATE
      - MAJOR
      - CRITICAL
      - ERROR

    {{
      "status": "PASSED",
      "issues": [
        {{
          "type": "CHARACTER",
          "description": "description of the issue",
          "severity": "WARNING",
          "fragment_id": "affected fragment id",
          "suggestion": "repair suggestion"
        }}
      ],
      "fragments_checked": ["list of fragment ids"],
      "summary": "audit summary"
    }}

    Return a valid JSON object only; do not add any extra explanatory text or symbols.
```


---

## C. El texto literal, paso por paso, con un guion real

Lo que sigue lo volcó el propio motor (no está escrito a mano): el encargo a PenShot, los planos que
devolvió, la traducción de cada uno, y el prompt final que recibe el motor de imagen y el de video.

## 0. El material del negocio (lo único que el sistema sabe de él)

Verificación continua de activos del mundo real (RWA) para instituciones y estados: torres del DIFC de Dubái, puertos y cadenas de custodia en Singapur, oro en Gauteng, litio y agua en Atacama, bonos de carbono en la Amazonía, plantas industriales en el Ruhr, energía offshore en Bergen, campo en la Pampa, tierras raras en el Gobi, madera en la Columbia Británica. Verificación por satélite, sensores de campo y auditoría en sitio.

### 1. El encargo que NUESTRO motor le manda a PenShot (guion + contexto)

```
Contexto de la pieza: aviso para redes en video vertical 9:16.
Se habla en español de Colombia y todo lo que aparezca en pantalla va en español de Colombia.
La pieza dura 30 segundos en total y cada plano dura 5 segundos o menos. Devolvé EXACTAMENTE 6 planos, uno por cada línea del guion, y que la suma de sus duraciones NO pase de 30 segundos.
El tono del negocio es «Profesional y formal».
El negocio hace: Verificación continua de activos del mundo real (RWA) para instituciones y estados: torres del DIFC de Dubái, puertos y cadenas de custodia en Singapur, oro en Gauteng, litio y agua en Atacama, bonos de carbono en la Amazonía, plantas industriales en el Ruhr, energía offshore en Bergen, campo en la Pampa, tierras raras en el Gobi, madera en la Columbia Británica. Verificación por satélite, sensores de campo y auditoría en sitio..
Cada plano muestra LO QUE ESA LÍNEA DICE, con el sujeto concreto de la frase: quién hace, qué hace y con qué.
Describe CADA PLANO con SOLO estos cuatro datos, sin adornos:
  1) QUIÉN HACE QUÉ: personas reales en medio del trabajo, con la acción en curso y concreta (un topógrafo apuntando, un auditor revisando, un operario cargando). Sin poses, sin mirar a cámara;
  2) DÓNDE: el lugar real y concreto, con sus señales de uso (polvo, huellas, herramientas, cableado, andamios, muelle, campo);
  3) CON QUÉ: los objetos que se ven en el cuadro, apoyados y quietos;
  4) CUÁNTO DURA: 5 segundos o menos.
NO escribas la luz, la hora del día, la óptica, el movimiento de cámara ni el acabado: de eso se encarga el motor, y lo que escribas se descarta.
BUSCA EL MUNDO REAL DEL NEGOCIO, no su metáfora: si vende verificación de activos, el plano es una torre en obra, un muelle con contenedores, una mina, una bodega de lingotes, un campo de cultivo o una sala de control — lo que el negocio realmente toca, y con lo que su material ya cuenta.
PROHIBIDO el look de folleto tecnológico: nada de globos azules, íconos flotantes, hologramas, cadenas de bloques, «streams de datos», planetas de neón ni dibujos 3D. Si el negocio es serio, se muestra con cosas que existen.
PROHIBIDO el relleno: nada de mesas con objetos, ventanas vacías ni pasillos si la línea habla de otra cosa.
Sin texto legible: ni carteles, ni etiquetas, ni rótulos, ni marcas, ni títulos (el generador convierte cualquier texto en letras deformes).
Cada plano dura 5 segundos o menos y tiene que poder ANIMARSE: se prefiere una acción en curso antes que una naturaleza muerta. No cambies el texto del guion.
EVITÁ EL PLANO MUY CERRADO DE MANOS MANIPULANDO UN APARATO: es lo que peor resuelve cualquier generador (los dedos se funden con el objeto). Preferí un plano medio o general donde la acción se lea en el cuerpo entero —caminar, mirar, señalar, cargar—, o un detalle de textura SIN manos (el metal, la madera, el suelo).
NO APOYES EL PLANO EN UN OBJETO CHICO EN LA MANO (un escáner, un teléfono, una llave, una herramienta): al animarse cambia de forma, se agranda o desaparece, y el cuadro entero se cae. Si hace falta el objeto, que esté apoyado y quieto, no en la mano.
ESQUIVÁ LAS SUPERFICIES ROTULADAS: contenedores con códigos, carteles, máquinas con placas, envases con etiquetas. Cualquier letra que traiga el lugar sale inventada y encima se deforma al moverse. Preferí lugares de superficies limpias (obra, campo, muelle vacío, sala con paredes lisas).

Guion, tal cual (cada línea es un tramo):
Usted ya tokenizo sus activos del mundo real.

Pero nadie le verifica que sigan existiendo.

Un satelite, sensores de campo y auditoria en sitio lo confirman.

La IA revisa que la informacion del activo sea coherente.

Su historia verificable queda custodiada con un score de confianza.

Escriba por Facebook
```


_por qué: PenShot desglosa sin contexto si no se le da: el formato, la duración, el idioma, el país y el tono van en un encabezado corto, y el guion va literal para que no lo reescriba._


## 2. Los planos de PenShot (19 planos · 64.64s · el motor usa los primeros 6)

### Plano 1 · 3.9s

**a) lo que PenShot escribe (281 caracteres):**

```
wide shot, cinematic, Dubai morning, clear sky, high-rise building under construction, dense scaffolding covering exterior walls, towering crane on top, dusty ground construction site, clear machinery track marks, Fujifilm ETERNA grading, natural overcast, 35mm lens, static camera
```

**b) el negativo que trae el plano:**

```
blurry, text, watermark, people, cartoon, anime, night, rain, snow, fog, low quality, distorted
```

**c) después de la traducción al inglés (282 caracteres):**

```
Wide shot, cinematic, Dubai morning, clear sky, high-rise building under construction, dense scaffolding covering exterior walls, towering crane on top, dusty ground construction site, clear machinery track marks, Fujifilm ETERNA grading, natural overcast, 35mm lens, static camera.
```

**d) LO QUE RECIBE EL MOTOR DE IMAGEN (718 caracteres) — imagen-flux-dev:**

```
Dubai, clear sky, high-rise building under construction, dense scaffolding covering exterior walls, towering, dusty ground construction site, clear machinery track marks, natural, wide establishing shot, shot on a 24mm wide lens, deep focus, everything sharp, golden hour, low warm sun raking across the scene, long shadows, locked-off tripod, no camera movement, restrained film grade, Fujifilm ETERNA emulation, muted greens, neutral skin tones, fine film grain, 35mm negative texture, candid documentary moment, photographed on location, natural imperfections, worn tools and surfaces, real working environment, incidental unmarked equipment, surfaces without lettering, vertical 9:16 framing, muted neutral palette
```

**e) negativo que va con la imagen:** `(vacío: FLUX es de guía destilada y no usa negativo)`

_por qué así: FLUX.1-dev es el modelo bueno (guía 3,5 en su propio nodo y unos 22 pasos contra los 4 del destilado): atiende mejor la escena y el oficio, pero como todo FLUX muestrea sin negativo, así que lo que no se quiere se pide en positivo («cuadro limpio, superficies lisas, sin rótulos») y la escena se pidió en inglés (es lo que leen estos modelos)._

**f) LO QUE RECIBE EL MOTOR DE VIDEO (329 caracteres):**

```
Dubai, clear sky, high-rise building under construction, dense scaffolding covering exterior walls, towering, dusty ground construction site, clear machinery track marks, natural., crane on top, the action continues naturally through the whole shot, real movement between frames, subtle motion of people, hands and drifting light
```

### Plano 2 · 2s

**a) lo que PenShot escribe (394 caracteres):**

```
medium shot, cinematic, a male surveyor standing with back to camera, wearing yellow hard hat, orange reflective vest, khaki work pants, field boots, right hand holding a gray survey staff with metal tip pointing toward a distant construction tower, dusty ground, scaffolding and crane in background, natural overcast light, Fujifilm ETERNA grading, 35mm lens, static camera, subtle motion blur
```

**b) el negativo que trae el plano:**

```
blurry, text, watermark, cartoon, anime, smiling, facing camera, wrong vest color, missing hard hat, missing survey staff, indoor, night
```

**c) después de la traducción al inglés (411 caracteres):**

```
Medium shot, cinematic, a male surveyor standing with his back to the camera, wearing a yellow hard hat, orange reflective vest, khaki work pants, field boots, right hand holding a gray survey staff with a metal tip pointing toward a distant construction tower, dusty ground, scaffolding and crane in the background, natural overcast light, Fujifilm ETERNA grading, 35mm lens, static camera, subtle motion blur.
```

**d) LO QUE RECIBE EL MOTOR DE IMAGEN (824 caracteres) — imagen-flux-dev:**

```
a male surveyor standing with his back to the camera, wearing a yellow hard hat, orange reflective vest, khaki work pants, field boots, right hand holding a gray survey staff with a metal tip pointing toward a distant construction tower, dusty ground, scaffolding and, natural, subtle, wide establishing shot, shot on a 24mm wide lens, deep focus, everything sharp, golden hour, low warm sun raking across the scene, long shadows, locked-off tripod, no camera movement, restrained film grade, Fujifilm ETERNA emulation, muted greens, neutral skin tones, fine film grain, 35mm negative texture, candid documentary moment, photographed on location, natural imperfections, worn tools and surfaces, real working environment, incidental unmarked equipment, surfaces without lettering, vertical 9:16 framing, muted neutral palette
```

**e) negativo que va con la imagen:** `(vacío: FLUX es de guía destilada y no usa negativo)`

_por qué así: FLUX.1-dev es el modelo bueno (guía 3,5 en su propio nodo y unos 22 pasos contra los 4 del destilado): atiende mejor la escena y el oficio, pero como todo FLUX muestrea sin negativo, así que lo que no se quiere se pide en positivo («cuadro limpio, superficies lisas, sin rótulos») y la escena se pidió en inglés (es lo que leen estos modelos)._

**f) LO QUE RECIBE EL MOTOR DE VIDEO (429 caracteres):**

```
a male surveyor standing with his back to the camera, wearing a yellow hard hat, orange reflective vest, khaki work pants, field boots, right hand holding a gray survey staff with a metal tip pointing toward a distant construction tower, dusty ground, scaffolding and, natural, subtle., camera, the action continues naturally through the whole shot, real movement between frames, subtle motion of people, hands and drifting light
```

### Plano 3 · 4.5s

**a) lo que PenShot escribe (353 caracteres):**

```
extreme close-up, cinematic, back of male surveyor in yellow hard hat and orange reflective vest, gray surveyor staff with metallic tip pointing toward distant tower, blurred scaffolding and construction crane in background, dusty ground, natural overcast light, Fujifilm ETERNA grading, 35mm lens, shallow depth of field, static camera, subtle handheld
```

**b) el negativo que trae el plano:**

```
blurry staff, wrong vest color, missing hard hat, clear background, text on surfaces, cartoon style, smiling face
```

**c) después de la traducción al inglés (354 caracteres):**

```
Extreme close-up, cinematic, back of male surveyor in yellow hard hat and orange reflective vest, gray surveyor staff with metallic tip pointing toward distant tower, blurred scaffolding and construction crane in background, dusty ground, natural overcast light, Fujifilm ETERNA grading, 35mm lens, shallow depth of field, static camera, subtle handheld.
```

**d) LO QUE RECIBE EL MOTOR DE IMAGEN (745 caracteres) — imagen-flux-dev:**

```
back of male surveyor in yellow hard hat and orange reflective vest, gray surveyor staff with metallic tip pointing toward distant tower, blurred scaffolding and construction, dusty ground, natural, subtle, wide establishing shot, shot on a 24mm wide lens, deep focus, everything sharp, golden hour, low warm sun raking across the scene, long shadows, locked-off tripod, no camera movement, restrained film grade, Fujifilm ETERNA emulation, muted greens, neutral skin tones, fine film grain, 35mm negative texture, candid documentary moment, photographed on location, natural imperfections, worn tools and surfaces, real working environment, incidental unmarked equipment, surfaces without lettering, vertical 9:16 framing, muted neutral palette
```

**e) negativo que va con la imagen:** `(vacío: FLUX es de guía destilada y no usa negativo)`

_por qué así: FLUX.1-dev es el modelo bueno (guía 3,5 en su propio nodo y unos 22 pasos contra los 4 del destilado): atiende mejor la escena y el oficio, pero como todo FLUX muestrea sin negativo, así que lo que no se quiere se pide en positivo («cuadro limpio, superficies lisas, sin rótulos») y la escena se pidió en inglés (es lo que leen estos modelos)._

**f) LO QUE RECIBE EL MOTOR DE VIDEO (363 caracteres):**

```
back of male surveyor in yellow hard hat and orange reflective vest, gray surveyor staff with metallic tip pointing toward distant tower, blurred scaffolding and construction, dusty ground, natural, subtle., crane in background, the action continues naturally through the whole shot, real movement between frames, subtle motion of people, hands and drifting light
```

### Plano 4 · 3.9s

**a) lo que PenShot escribe (451 caracteres):**

```
wide shot, cinematic, overcast sky, Singapore port dock, stacked shipping containers in neat rows, tall cranes standing in background, an auditor wearing white hard hat, yellow reflective vest, light blue long-sleeve shirt, dark trousers, standing beside containers, holding black tablet with both hands, gazing toward containers, clean dock surface, Fujifilm ETERNA grading, natural overcast lighting, 35mm lens, static camera, subtle handheld motion
```

**b) el negativo que trae el plano:**

```
blurry, text on containers, wrong vest color, missing hard hat, smiling, cartoon style, extra limbs, distorted tablet
```

**c) después de la traducción al inglés (406 caracteres):**

```
Wide shot, cinematic, overcast sky, Singapore port dock, stacked shipping containers in neat rows, tall cranes standing in background, an auditor wearing a white hard hat, yellow reflective vest, light blue long-sleeve shirt, dark trousers, standing beside containers, holding a black tablet with both hands, gazing toward containers, clean dock surface, Fujifilm ETERNA grading, natural overcast lighting.
```

**d) LO QUE RECIBE EL MOTOR DE IMAGEN (836 caracteres) — imagen-flux-dev:**

```
Singapore port dock, stacked shipping containers in neat rows, tall cranes standing in background, an auditor wearing a white hard hat, yellow reflective vest, dark trousers, standing beside containers, holding a black tablet with both hands, gazing toward containers, clean dock surface, natural, wide establishing shot, shot on a 24mm wide lens, deep focus, everything sharp, golden hour, low warm sun raking across the scene, long shadows, locked-off tripod, no camera movement, restrained film grade, Fujifilm ETERNA emulation, muted greens, neutral skin tones, fine film grain, 35mm negative texture, candid documentary moment, photographed on location, natural imperfections, worn tools and surfaces, real working environment, incidental unmarked equipment, surfaces without lettering, vertical 9:16 framing, muted neutral palette
```

**e) negativo que va con la imagen:** `(vacío: FLUX es de guía destilada y no usa negativo)`

_por qué así: FLUX.1-dev es el modelo bueno (guía 3,5 en su propio nodo y unos 22 pasos contra los 4 del destilado): atiende mejor la escena y el oficio, pero como todo FLUX muestrea sin negativo, así que lo que no se quiere se pide en positivo («cuadro limpio, superficies lisas, sin rótulos») y la escena se pidió en inglés (es lo que leen estos modelos)._

**f) LO QUE RECIBE EL MOTOR DE VIDEO (464 caracteres):**

```
Singapore port dock, stacked shipping containers in neat rows, tall cranes standing in background, an auditor wearing a white hard hat, yellow reflective vest, dark trousers, standing beside containers, holding a black tablet with both hands, gazing toward containers, clean dock surface, natural., cranes standing in background, the action continues naturally through the whole shot, real movement between frames, subtle motion of people, hands and drifting light
```

### Plano 5 · 2s

**a) lo que PenShot escribe (457 caracteres):**

```
medium shot, auditor standing beside stacked shipping containers, wearing white hard hat and yellow reflective vest over light blue long-sleeve shirt and dark trousers, head bowed, both hands holding black tablet, fingers sliding across screen, overcast diffused daylight, Fujifilm ETERNA cool low-saturation grading, 35mm lens, static camera, subtle handheld sway, port dock with container stacks and crane silhouettes in background, shallow depth of field
```

**b) el negativo que trae el plano:**

```
blurry fingers, text on tablet screen, wrong vest color, orange vest, missing hard hat, smiling, cartoon style, bright sunlight, harsh shadows, distorted hands
```

**c) después de la traducción al inglés (428 caracteres):**

```
Medium shot, auditor standing beside stacked shipping containers, wearing a white hard hat and a yellow reflective vest over a light blue long-sleeve shirt and dark trousers, head bowed, both hands holding a black tablet, fingers sliding across the screen, overcast diffused daylight, Fujifilm ETERNA cool low-saturation grading, 35mm lens, static camera, subtle handheld sway, port dock with container stacks in the background.
```

**d) LO QUE RECIBE EL MOTOR DE IMAGEN (794 caracteres) — imagen-flux-dev:**

```
auditor standing beside stacked shipping containers, wearing a white hard hat and a yellow reflective vest over a, head bowed, both hands holding a black tablet, fingers sliding across the screen, subtle, port dock with container stacks in the background, wide establishing shot, shot on a 24mm wide lens, deep focus, everything sharp, golden hour, low warm sun raking across the scene, long shadows, locked-off tripod, no camera movement, restrained film grade, Fujifilm ETERNA emulation, muted greens, neutral skin tones, fine film grain, 35mm negative texture, candid documentary moment, photographed on location, natural imperfections, worn tools and surfaces, real working environment, incidental unmarked equipment, surfaces without lettering, vertical 9:16 framing, muted neutral palette
```

**e) negativo que va con la imagen:** `(vacío: FLUX es de guía destilada y no usa negativo)`

_por qué así: FLUX.1-dev es el modelo bueno (guía 3,5 en su propio nodo y unos 22 pasos contra los 4 del destilado): atiende mejor la escena y el oficio, pero como todo FLUX muestrea sin negativo, así que lo que no se quiere se pide en positivo («cuadro limpio, superficies lisas, sin rótulos») y la escena se pidió en inglés (es lo que leen estos modelos)._

**f) LO QUE RECIBE EL MOTOR DE VIDEO (399 caracteres):**

```
auditor standing beside stacked shipping containers, wearing a white hard hat and a yellow reflective vest over a, head bowed, both hands holding a black tablet, fingers sliding across the screen, subtle, port dock with container stacks in the background., camera, the action continues naturally through the whole shot, real movement between frames, subtle motion of people, hands and drifting light
```

### Plano 6 · 4.5s

**a) lo que PenShot escribe (339 caracteres):**

```
extreme close-up of female auditor's face, white hard hat, yellow reflective vest, light blue long-sleeve shirt, blurred stacked shipping containers in background, professional and formal expression, natural overcast lighting, shallow depth of field, Fujifilm ETERNA grading, 35mm lens, static camera, subtle motion blur 0.3, frame rate 24
```

**b) el negativo que trae el plano:**

```
blurry face, distorted features, text on containers, wrong vest color, missing hard hat, cartoon style, oversaturated colors, smiling, casual clothing
```

**c) después de la traducción al inglés (346 caracteres):**

```
Extreme close-up of a female auditor s face, white hard hat, yellow reflective vest, light blue long-sleeve shirt, blurred stacked shipping containers in the background, professional and formal expression, natural overcast lighting, shallow depth of field, Fujifilm ETERNA grading, 35mm lens, static camera, subtle motion blur 0.3, frame rate 24.
```

**d) LO QUE RECIBE EL MOTOR DE IMAGEN (652 caracteres) — imagen-flux-dev:**

```
white hard hat, yellow reflective vest, blurred stacked shipping containers in the background, natural, subtle.3, wide establishing shot, shot on a 24mm wide lens, deep focus, everything sharp, golden hour, low warm sun raking across the scene, long shadows, locked-off tripod, no camera movement, restrained film grade, Fujifilm ETERNA emulation, muted greens, neutral skin tones, fine film grain, 35mm negative texture, candid documentary moment, photographed on location, natural imperfections, worn tools and surfaces, real working environment, incidental unmarked equipment, surfaces without lettering, vertical 9:16 framing, muted neutral palette
```

**e) negativo que va con la imagen:** `(vacío: FLUX es de guía destilada y no usa negativo)`

_por qué así: FLUX.1-dev es el modelo bueno (guía 3,5 en su propio nodo y unos 22 pasos contra los 4 del destilado): atiende mejor la escena y el oficio, pero como todo FLUX muestrea sin negativo, así que lo que no se quiere se pide en positivo («cuadro limpio, superficies lisas, sin rótulos») y la escena se pidió en inglés (es lo que leen estos modelos)._

**f) LO QUE RECIBE EL MOTOR DE VIDEO (257 caracteres):**

```
white hard hat, yellow reflective vest, blurred stacked shipping containers in the background, natural, subtle.3., camera, the action continues naturally through the whole shot, real movement between frames, subtle motion of people, hands and drifting light
```


### 3. Lo que lee la voz (voz + subtítulos salen de acá)

```
Usted ya tokenizo sus activos del mundo real. Pero nadie le verifica que sigan existiendo. Un satelite sensores de campo y auditoria en sitio lo confirman. La IA revisa que la informacion del activo sea coherente. Su historia verificable queda custodiada con un score de confianza. Escriba por Facebook.
```

voz elegida: **en-GB-RyanNeural** · ritmo 0.92 → -8% · la pieza va en inglés con tono institucional: voz sobria de registro británico

se le quitó antes de leerlo: nada — Edge TTS lee lo que le pongan: se limpia la forma (emojis, numerales, enlaces, markdown, viñetas, comillas) y el contenido queda igual. Los renglones se cierran con punto para que no encadene dos bloques.

---

## D. Lo que queda por decidir (nada de esto gasta GPU)

1. **Quién es el dueño del prompt visual → RESUELTO: el motor.** PenShot aporta las variables duras (quién
   hace qué, dónde, con qué, cuánto dura) y **el motor decide el cine** (`cineDeLaPieza`): tamaño de plano,
   óptica, luz que avanza con la pieza y **un solo etalonaje**. Lo que el plano diga de luz, cámara, óptica o
   acabado **se descarta** (`soloVariablesDuras`), porque su instrucción es de continuidad («evitá la jerga
   técnica», «sé conciso», 20-200 palabras) y no de dirección de fotografía. Medido después del cambio:
   general 24mm hora dorada → medio 35mm → medio corto 85mm luz pareja → medio → general 24mm hora azul →
   primer plano 85mm, con **ETERNA en los seis** y cero restos de su estética.
2. **El guion necesita sujeto filmable en cada línea.** Si la línea es «la trazabilidad se rompe», no hay
   nada que filmar.
3. **El motor de video necesita el movimiento escrito aparte** (ya está hecho: `textoDeMovimiento`).
4. **Medir sin gastar**: la mesa de prueba (`pruebas/preview-prompts.ts`) recorre toda la cadena sin GPU.
