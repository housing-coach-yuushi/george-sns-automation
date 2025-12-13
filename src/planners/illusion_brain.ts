export interface VideoPlan {
    title: string;
    concept: string;
    scenes: Scene[];
    narration: string;
}

export interface Scene {
    id: number;
    type: 'image' | 'video';
    prompt_image: string;
    prompt_video?: string;
    duration: number;
}

const ARCHETYPES = [
    {
        name: "Double Exposure (Nature/Human)",
        concept: "A landscape that reveals a human silhouette when zoomed out.",
        narration: "We see the world not as it is, but as we are. Shift your perspective.",
        prompts: {
            image: "A mysterious landscape with two trees bending towards each other, a moon in the center, forming the silhouette of a human skull, optical illusion, double exposure, surrealism, 8k",
            video: "Camera slowly zooms out, the landscape elements align to clearly reveal the skull shape, eerie atmosphere, cinematic movement"
        }
    },
    {
        name: "Morphing (Chaos/Order)",
        concept: "Chaotic elements organizing into a perfect shape.",
        narration: "Chaos is just order you haven't understood yet. Trust the process.",
        prompts: {
            image: "A chaotic pile of twisted rusty metal and thorns, dark background, high detail, 8k, photorealistic",
            video: "The metal and thorns twist and morph smoothly into a beautiful golden crown, glowing light, magical transformation, cinematic"
        }
    },
    {
        name: "Negative Space (Shadow/Light)",
        concept: "A shadow that looks like something else.",
        narration: "Your shadow defines your light. Don't be afraid of the dark.",
        prompts: {
            image: "A single spotlight on a rough wall, the shadow cast by a pile of junk looks exactly like a flying bird, high contrast, artistic, 8k",
            video: "The light source moves slightly, the shadow bird flaps its wings, cinematic lighting"
        }
    }
];

export class IllusionBrain {
    constructor() { }

    /**
     * Generates a video plan based on a random archetype.
     */
    async generatePlan(): Promise<VideoPlan> {
        // 1. Select Random Archetype
        const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];

        console.log(`[Brain] Selected Archetype: ${archetype.name}`);

        // 2. Construct Plan
        const plan: VideoPlan = {
            title: archetype.name,
            concept: archetype.concept,
            narration: archetype.narration,
            scenes: [
                {
                    id: 1,
                    type: 'video',
                    prompt_image: archetype.prompts.image,
                    prompt_video: archetype.prompts.video,
                    duration: 5
                }
            ]
        };

        return plan;
    }
}
