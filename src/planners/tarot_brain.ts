export interface VideoPlan {
    title: string;
    concept: string;
    narration: string;
    scenes: {
        id: number;
        type: 'image' | 'video' | 'extension';
        prompt_image?: string;
        prompt_video?: string;
        duration?: number;
    }[];
}

interface TarotCard {
    name: string;
    meaning: string;
    punchline: string;
    visual_prompt: string;
}

const MAJOR_ARCANA: TarotCard[] = [
    {
        name: "THE FOOL",
        meaning: "New beginnings, innocence, spontaneity",
        punchline: "迷うのは、進みたい証拠だ。ゼロになれ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Fool tarot card. A figure standing on a cliff edge at dawn, mystical fog, golden light breaking through dark clouds, no humans, atmospheric, highly detailed, 8k, photorealistic, dark aesthetic"
    },
    {
        name: "THE MAGICIAN",
        meaning: "Manifestation, resourcefulness, power",
        punchline: "道具は揃っている。あとは、やるかやらないかだ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Magician tarot card. A table with ancient artifacts (cup, sword, wand, pentacle) glowing in a dark room, floating in the air, magical energy, 8k, photorealistic"
    },
    {
        name: "THE HIGH PRIESTESS",
        meaning: "Intuition, sacred knowledge, divine feminine",
        punchline: "答えはスマホの中じゃない。あなたの内側にある。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The High Priestess tarot card. A mysterious veil behind two pillars (one black, one white), moonlight shining through, ancient scroll, mystical atmosphere, 8k"
    },
    {
        name: "THE EMPRESS",
        meaning: "Femininity, beauty, nature, nurturing",
        punchline: "頑張るな。受け入れろ。豊かさは向こうからやってくる。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Empress tarot card. A throne in the middle of a dark lush forest, glowing flowers, golden crown, abundance, nature reclaiming ruins, 8k"
    },
    {
        name: "THE EMPEROR",
        meaning: "Authority, establishment, structure",
        punchline: "感情を捨てろ。ルールを作れ。それが王の道だ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Emperor tarot card. A stone throne on a rocky mountain, red lighting, stern atmosphere, power, stability, 8k"
    },
    {
        name: "THE HIEROPHANT",
        meaning: "Spiritual wisdom, religious beliefs, conformity",
        punchline: "学ぶ時が来た。先人の知恵を借りれば、近道ができる。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Hierophant tarot card. A grand cathedral interior, stained glass casting colorful light in darkness, two keys crossed, sacred atmosphere, 8k"
    },
    {
        name: "THE LOVERS",
        meaning: "Love, harmony, relationships, choices",
        punchline: "理屈で選ぶな。魂が震える方を選べ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Lovers tarot card. Two trees intertwining, an angel figure in the clouds above, golden light, harmony, duality, 8k"
    },
    {
        name: "THE CHARIOT",
        meaning: "Control, willpower, success, action",
        punchline: "止まるな。迷いを振り切って、ただ突き進め。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Chariot tarot card. A golden chariot moving forward through dark mist, driven by invisible force, armor, motion blur, speed, 8k"
    },
    {
        name: "STRENGTH",
        meaning: "Strength, courage, persuasion, influence",
        punchline: "本当の強さとは、力ずくではない。受け入れることだ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of Strength tarot card. A lion resting calmly, a gentle hand touching its mane, soft golden light in darkness, inner power, 8k"
    },
    {
        name: "THE HERMIT",
        meaning: "Soul-searching, introspection, being alone",
        punchline: "孤独を恐れるな。それは自分と対話する贅沢な時間だ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Hermit tarot card. A lone lantern glowing on a snowy mountain peak at night, darkness all around, guiding light, solitude, 8k"
    },
    {
        name: "WHEEL OF FORTUNE",
        meaning: "Good luck, karma, life cycles, destiny",
        punchline: "流れが変わった。今すぐ乗れ。チャンスは一瞬だ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of Wheel of Fortune tarot card. A giant ancient golden wheel spinning in the cosmos, stars, destiny, mystical mechanism, 8k"
    },
    {
        name: "JUSTICE",
        meaning: "Justice, fairness, truth, cause and effect",
        punchline: "言い訳は通用しない。あなたが撒いた種を、あなたが刈り取る。",
        visual_prompt: "A cinematic, dark fantasy interpretation of Justice tarot card. A balanced scale glowing in the dark, a sword held upright, symmetry, cold blue lighting, truth, 8k"
    },
    {
        name: "THE HANGED MAN",
        meaning: "Pause, surrender, letting go, new perspectives",
        punchline: "行き詰まったら、逆立ちしてみろ。世界は違って見える。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Hanged Man tarot card. A figure suspended upside down from a tree, halo around the head, peaceful expression, different perspective, 8k"
    },
    {
        name: "DEATH",
        meaning: "Endings, change, transformation, transition",
        punchline: "終わらせろ。捨てなければ、新しいものは入ってこない。",
        visual_prompt: "A cinematic, dark fantasy interpretation of Death tarot card. A black armor figure on a white horse, sun setting in the background, red sky, transformation, end and beginning, 8k"
    },
    {
        name: "TEMPERANCE",
        meaning: "Balance, moderation, patience, purpose",
        punchline: "焦るな。混ぜ合わせろ。時間はあなたの味方だ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of Temperance tarot card. An angel pouring water between two cups, glowing liquid, alchemy, balance, harmony, 8k"
    },
    {
        name: "THE DEVIL",
        meaning: "Shadow self, attachment, addiction, restriction",
        punchline: "その鎖は、実はあなたが握っている。手放せば自由だ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Devil tarot card. Dark chains in a dungeon, faint red glow, shadow figures, temptation, bondage, 8k"
    },
    {
        name: "THE TOWER",
        meaning: "Sudden change, upheaval, chaos, revelation",
        punchline: "壊れることを恐れるな。それは偽物が消える合図だ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Tower tarot card. A tall stone tower struck by lightning, crumbling, fire, dramatic storm, destruction, revelation, 8k"
    },
    {
        name: "THE STAR",
        meaning: "Hope, faith, purpose, renewal, spirituality",
        punchline: "暗闇だからこそ、星は輝く。希望を捨てるな。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Star tarot card. A large bright star in the night sky, reflection in a pool of water, naked figure pouring water, hope, serenity, 8k"
    },
    {
        name: "THE MOON",
        meaning: "Illusion, fear, anxiety, subconscious, intuition",
        punchline: "不安は幻想だ。霧の向こうに真実がある。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Moon tarot card. A full moon between two towers, a wolf and a dog howling, a crayfish emerging from water, mist, mystery, 8k"
    },
    {
        name: "THE SUN",
        meaning: "Positivity, fun, warmth, success, vitality",
        punchline: "あなたは素晴らしい。ただそれだけでいい。輝け。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The Sun tarot card. A giant golden sun with a face, sunflowers, a child on a white horse, bright warm light, joy, success, 8k"
    },
    {
        name: "JUDGEMENT",
        meaning: "Judgement, rebirth, inner calling, absolution",
        punchline: "過去は関係ない。今、この瞬間に生まれ変われ。",
        visual_prompt: "A cinematic, dark fantasy interpretation of Judgement tarot card. Angels blowing trumpets in the sky, figures rising from graves, golden light, resurrection, awakening, 8k"
    },
    {
        name: "THE WORLD",
        meaning: "Completion, integration, accomplishment, travel",
        punchline: "旅は終わった。そしてまた始まる。完璧な調和の中で。",
        visual_prompt: "A cinematic, dark fantasy interpretation of The World tarot card. A figure dancing inside a laurel wreath, four elemental signs in corners, cosmic background, completion, wholeness, 8k"
    }
];

export class TarotBrain {
    constructor() { }

    /**
     * Generates a video plan based on a random Tarot Card.
     * Returns a Progressive Plan for Veo 3.1 Extend workflow.
     */
    async generatePlan(): Promise<VideoPlan> {
        // 1. Select Random Card
        const card = MAJOR_ARCANA[Math.floor(Math.random() * MAJOR_ARCANA.length)];

        // 2. Select Visual Style (Viral Archetype)
        const styles = [
            {
                name: "Celestial Reveal",
                prompt_prefix: "Cinematic shot, tarot card floating in deep space, nebula background, glowing stars, mystical atmosphere, "
            },
            {
                name: "Shadow Altar",
                prompt_prefix: "Close up, tarot card on dark velvet table, black candles burning, smoke swirling, gothic aesthetic, photorealistic, "
            },
            {
                name: "Golden Mist",
                prompt_prefix: "Cinematic shot, tarot card emerging from golden fog, divine light rays, luxury dark aesthetic, highly detailed, "
            }
        ];
        const style = styles[Math.floor(Math.random() * styles.length)];

        console.log(`[Brain] Selected Card: ${card.name}`);
        console.log(`[Brain] Selected Style: ${style.name}`);

        // 3. Construct Progressive Plan
        const basePrompt = `${style.prompt_prefix}${card.visual_prompt}`;

        const plan: VideoPlan = {
            title: card.name,
            concept: `${card.meaning} (${style.name})`,
            narration: card.punchline,
            scenes: [
                {
                    id: 1,
                    type: 'video',
                    prompt_image: basePrompt, // Used for Image-to-Video base if needed, or Text-to-Video
                    prompt_video: "Intro shot: The card slowly emerges from the atmosphere, glowing faintly, mysterious, cinematic lighting, 8k, slow smooth motion",
                    duration: 8 // Veo base is usually ~8s
                },
                {
                    id: 2,
                    type: 'extension', // New type
                    prompt_video: "Main shot: The card rotates slowly, light intensifies, magical particles swirl around it, high detail, 8k, continue motion",
                    duration: 5 // Extension
                },
                {
                    id: 3,
                    type: 'extension', // New type
                    prompt_video: "Outro shot: The card fades into the distance, particles disperse, lingering atmosphere, cinematic fade out, continue motion",
                    duration: 5 // Extension
                }
            ]
        };

        return plan;
    }
}
