import { Difficulty, ExamBoard, PrismaClient, QuestionType } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedQuestion {
  topic: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

interface SeedSubject {
  code: string;
  name: string;
  content: Record<Extract<ExamBoard, "WAEC" | "NECO" | "UTME">, SeedQuestion[]>;
}

// Original practice questions written to match WAEC/NECO/UTME senior-secondary
// (SS2/SS3) syllabus coverage and question style. These are NOT copies of any
// official past paper — see the "Exam content source" decision in the plan
// this script implements.
const SUBJECTS: SeedSubject[] = [
  {
    code: "MTH",
    name: "Mathematics",
    content: {
      WAEC: [
        { topic: "Indices", text: "Simplify 2³ × 2⁴", options: ["128", "64", "32", "2¹²"], correctIndex: 0 },
        { topic: "Logarithms", text: "If log₁₀ 2 = 0.3010, find log₁₀ 8", options: ["0.9030", "0.6020", "0.3010", "2.4082"], correctIndex: 0 },
        { topic: "Quadratic equations", text: "Solve x² - 5x + 6 = 0", options: ["x = 2 or 3", "x = -2 or -3", "x = 1 or 6", "x = 2 or -3"], correctIndex: 0 },
        { topic: "Simultaneous equations", text: "Solve the equations x + y = 7 and x - y = 1", options: ["x = 4, y = 3", "x = 3, y = 4", "x = 5, y = 2", "x = 2, y = 5"], correctIndex: 0 },
        { topic: "Sequences and series", text: "Find the 10th term of the arithmetic progression 3, 7, 11, ...", options: ["39", "35", "43", "36"], correctIndex: 0 },
        { topic: "Surds", text: "Simplify √50", options: ["5√2", "2√5", "10√5", "25√2"], correctIndex: 0 },
        { topic: "Trigonometry", text: "If sin θ = 3/5 and θ is acute, find tan θ", options: ["3/4", "4/3", "5/3", "5/4"], correctIndex: 0 },
        { topic: "Mensuration", text: "Find the area of a circle of radius 7 cm (π = 22/7)", options: ["154 cm²", "44 cm²", "22 cm²", "308 cm²"], correctIndex: 0 },
        { topic: "Probability", text: "A bag contains 5 red balls and 3 blue balls. Find the probability of picking a red ball", options: ["5/8", "3/8", "5/3", "1/8"], correctIndex: 0 },
        { topic: "Statistics", text: "Find the mean of 2, 4, 6, 8, 10", options: ["6", "5", "8", "4"], correctIndex: 0 },
        { topic: "Coordinate geometry", text: "Find the gradient of the line joining (2, 3) and (4, 7)", options: ["2", "1/2", "-2", "4"], correctIndex: 0 },
        { topic: "Variation", text: "y varies directly as x. If y = 10 when x = 2, find y when x = 5", options: ["25", "20", "10", "4"], correctIndex: 0 },
        { topic: "Set theory", text: "If n(A) = 12, n(B) = 9 and n(A ∩ B) = 4, find n(A ∪ B)", options: ["17", "21", "13", "5"], correctIndex: 0 },
        { topic: "Binary operations", text: "The operation a * b is defined as a + b - ab. Find 2 * 3", options: ["-1", "5", "1", "6"], correctIndex: 0 },
        { topic: "Inequalities", text: "Solve the inequality 2x - 3 > 7", options: ["x > 5", "x < 5", "x > 2", "x < 2"], correctIndex: 0 },
      ],
      NECO: [
        { topic: "Indices", text: "Simplify (3²)³", options: ["729", "243", "3⁹", "3⁸"], correctIndex: 0 },
        { topic: "Logarithms", text: "Evaluate log₂ 32", options: ["5", "4", "6", "16"], correctIndex: 0 },
        { topic: "Quadratic equations", text: "Find the sum of the roots of 2x² - 4x - 6 = 0", options: ["2", "-2", "3", "-3"], correctIndex: 0 },
        { topic: "Simultaneous equations", text: "Solve 2x + y = 9 and x - y = 3", options: ["x = 4, y = 1", "x = 3, y = 3", "x = 1, y = 7", "x = 5, y = -1"], correctIndex: 0 },
        { topic: "Sequences and series", text: "Find the common ratio of the geometric progression 2, 6, 18, 54, ...", options: ["3", "4", "2", "18"], correctIndex: 0 },
        { topic: "Surds", text: "Rationalize 1/√3", options: ["√3/3", "1/3", "3", "√3"], correctIndex: 0 },
        { topic: "Trigonometry", text: "Evaluate sin 30° + cos 60°", options: ["1", "0.5", "1.5", "0"], correctIndex: 0 },
        { topic: "Mensuration", text: "Find the circumference of a circle of radius 14 cm (π = 22/7)", options: ["88 cm", "44 cm", "154 cm", "28 cm"], correctIndex: 0 },
        { topic: "Probability", text: "Two fair dice are rolled together. Find the probability that the sum of the scores is 7", options: ["1/6", "1/12", "1/36", "7/36"], correctIndex: 0 },
        { topic: "Statistics", text: "Find the median of 3, 5, 7, 9, 11, 13", options: ["8", "7", "9", "6"], correctIndex: 0 },
        { topic: "Coordinate geometry", text: "Find the distance between the points (0, 0) and (3, 4)", options: ["5", "7", "25", "4"], correctIndex: 0 },
        { topic: "Variation", text: "p is inversely proportional to q. If p = 4 when q = 3, find p when q = 6", options: ["2", "8", "12", "6"], correctIndex: 0 },
        { topic: "Set theory", text: "A universal set has 20 elements. If set A has 8 elements, find n(A')", options: ["12", "8", "20", "28"], correctIndex: 0 },
        { topic: "Number bases", text: "Convert 25 (base 10) to base 2", options: ["11001", "11010", "10101", "11100"], correctIndex: 0 },
        { topic: "Commercial arithmetic", text: "Find the simple interest on ₦20,000 at 5% per annum for 2 years", options: ["₦2,000", "₦1,000", "₦4,000", "₦20,500"], correctIndex: 0 },
      ],
      UTME: [
        { topic: "Fractions", text: "Simplify 3/4 + 1/6", options: ["11/12", "4/10", "2/3", "7/12"], correctIndex: 0 },
        { topic: "Functions", text: "If f(x) = 2x + 3, find f(4)", options: ["11", "8", "14", "7"], correctIndex: 0 },
        { topic: "Factorization", text: "Factorize x² - 9", options: ["(x - 3)(x + 3)", "(x - 9)(x + 1)", "(x + 3)²", "(x - 3)²"], correctIndex: 0 },
        { topic: "Linear equations", text: "Find the value of x if 3x - 7 = 11", options: ["6", "8", "4", "3"], correctIndex: 0 },
        { topic: "Fractions", text: "Convert 0.75 to a fraction in its lowest terms", options: ["3/4", "7/5", "75/10", "7/10"], correctIndex: 0 },
        { topic: "Number theory", text: "Find the LCM of 4 and 6", options: ["12", "24", "2", "6"], correctIndex: 0 },
        { topic: "Number theory", text: "Evaluate 5! (5 factorial)", options: ["120", "20", "25", "60"], correctIndex: 0 },
        { topic: "Geometry", text: "A regular polygon has an interior angle of 150°. How many sides does it have?", options: ["12", "10", "8", "15"], correctIndex: 0 },
        { topic: "Speed, distance and time", text: "A car travels 150 km in 3 hours. Find its average speed", options: ["50 km/h", "45 km/h", "60 km/h", "30 km/h"], correctIndex: 0 },
        { topic: "Trigonometry", text: "Evaluate sin 90°", options: ["1", "0", "-1", "0.5"], correctIndex: 0 },
        { topic: "Indices", text: "Simplify 2⁻²", options: ["1/4", "-4", "4", "-1/4"], correctIndex: 0 },
        { topic: "Probability", text: "The probability that it will rain tomorrow is 0.7. Find the probability that it will NOT rain", options: ["0.3", "0.7", "1", "0"], correctIndex: 0 },
        { topic: "Sequences", text: "Find the next number in the sequence 2, 4, 8, 16, __", options: ["32", "24", "20", "18"], correctIndex: 0 },
        { topic: "Linear equations", text: "Solve for x: x/3 + 2 = 5", options: ["9", "3", "15", "1"], correctIndex: 0 },
        { topic: "Statistics", text: "Find the range of the data set 4, 8, 15, 16, 23, 42", options: ["38", "42", "4", "19"], correctIndex: 0 },
      ],
    },
  },
  {
    code: "ENG",
    name: "English Language",
    content: {
      WAEC: [
        { topic: "Concord", text: "Neither the teacher nor the students ___ happy with the result.", options: ["were", "was", "have been", "are being"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the option nearest in meaning to the word ABUNDANT", options: ["Plentiful", "Scarce", "Meager", "Rare"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the option opposite in meaning to the word DILIGENT", options: ["Lazy", "Hardworking", "Careful", "Swift"], correctIndex: 0 },
        { topic: "Grammar", text: "Fill the gap: She is the woman ___ car was stolen yesterday.", options: ["whose", "who", "which", "that"], correctIndex: 0 },
        { topic: "Spelling", text: "Choose the correctly spelt word", options: ["Necessary", "Neccessary", "Necesary", "Neccessarry"], correctIndex: 0 },
        { topic: "Figures of speech", text: "Identify the figure of speech in: \"The wind whispered through the trees.\"", options: ["Personification", "Simile", "Metaphor", "Hyperbole"], correctIndex: 0 },
        { topic: "Idioms", text: "Choose the option that best explains the idiom \"to bite the bullet\"", options: ["To face a difficult situation bravely", "To eat quickly", "To argue fiercely", "To avoid a task"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct preposition: The book is ___ the table.", options: ["on", "in", "at", "by"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct plural form of \"criterion\"", options: ["criteria", "criterions", "criterium", "criteras"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the option opposite in meaning to the word OPTIMISTIC", options: ["Pessimistic", "Hopeful", "Confident", "Cheerful"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct sentence", options: ["He doesn't like noise.", "He don't like noise.", "He not like noise.", "He didn't likes noise."], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the word that means \"a person who studies the stars\"", options: ["Astronomer", "Astrologer", "Geologist", "Biologist"], correctIndex: 0 },
        { topic: "Idioms and proverbs", text: "Complete the proverb: \"A stitch in time ___.\"", options: ["saves nine", "saves ten", "costs nine", "wastes time"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct form: \"By this time next year, I ___ my degree.\"", options: ["will have completed", "will complete", "completed", "have completed"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the option nearest in meaning to the word CANDID", options: ["Frank", "Secretive", "Dishonest", "Timid"], correctIndex: 0 },
      ],
      NECO: [
        { topic: "Lexis", text: "Choose the option opposite in meaning to the word GENEROUS", options: ["Stingy", "Kind", "Charitable", "Wealthy"], correctIndex: 0 },
        { topic: "Grammar", text: "Fill the gap: If I ___ rich, I would travel the world.", options: ["were", "was", "am", "be"], correctIndex: 0 },
        { topic: "Grammar", text: "Identify the part of speech of the underlined word: \"She sang beautifully.\"", options: ["Adverb", "Adjective", "Noun", "Verb"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the option nearest in meaning to the word RETICENT", options: ["Reserved", "Talkative", "Aggressive", "Anxious"], correctIndex: 0 },
        { topic: "Spelling", text: "Choose the correctly spelt word", options: ["Occurrence", "Occurence", "Ocurrence", "Occurrance"], correctIndex: 0 },
        { topic: "Idioms", text: "Complete the idiom: \"To let the cat out of the ___.\"", options: ["bag", "box", "house", "room"], correctIndex: 0 },
        { topic: "Concord", text: "Choose the correct sentence", options: ["Each of the students has a book.", "Each of the students have a book.", "Each of the student have a book.", "Each of the students having a book."], correctIndex: 0 },
        { topic: "Figures of speech", text: "Identify the figure of speech in: \"Life is a journey.\"", options: ["Metaphor", "Simile", "Personification", "Alliteration"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the option opposite in meaning to the word ANCIENT", options: ["Modern", "Old", "Antique", "Historic"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct question tag: \"You are coming, ___?\"", options: ["aren't you", "don't you", "isn't it", "won't you"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the word that means \"to make something legal\"", options: ["Legalize", "Criminalize", "Nullify", "Penalize"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct preposition: \"She is afraid ___ spiders.\"", options: ["of", "from", "with", "for"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the option opposite in meaning to the word TRANQUIL", options: ["Turbulent", "Calm", "Peaceful", "Serene"], correctIndex: 0 },
        { topic: "Idioms and proverbs", text: "Complete the proverb: \"Actions speak louder than ___.\"", options: ["words", "promises", "thoughts", "deeds"], correctIndex: 0 },
        { topic: "Concord", text: "Choose the correct form: \"Neither of the answers ___ correct.\"", options: ["is", "are", "were", "have been"], correctIndex: 0 },
      ],
      UTME: [
        { topic: "Lexis", text: "Choose the option nearest in meaning to the word METICULOUS", options: ["Careful", "Careless", "Hasty", "Lazy"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the option opposite in meaning to the word TRANSPARENT", options: ["Opaque", "Clear", "Visible", "Bright"], correctIndex: 0 },
        { topic: "Grammar", text: "Fill the gap: He has been living here ___ 2015.", options: ["since", "for", "from", "in"], correctIndex: 0 },
        { topic: "Spelling", text: "Choose the correctly spelt word", options: ["Embarrass", "Embarass", "Embarras", "Emberrass"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct sentence", options: ["I have seen the movie.", "I have saw the movie.", "I has seen the movie.", "I seen the movie."], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the option that best completes: \"The committee ___ its decision yesterday.\"", options: ["announced", "announce", "announces", "announcing"], correctIndex: 0 },
        { topic: "Lexis", text: "Identify the odd word out", options: ["Carrot", "Apple", "Banana", "Mango"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the option nearest in meaning to the word AMBIGUOUS", options: ["Unclear", "Obvious", "Certain", "Simple"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct preposition: \"He was accused ___ theft.\"", options: ["of", "for", "with", "on"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct plural of \"phenomenon\"", options: ["phenomena", "phenomenons", "phenomenas", "phenomenum"], correctIndex: 0 },
        { topic: "Idioms", text: "Complete the idiom: \"To spill the ___.\"", options: ["beans", "milk", "water", "tea"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct form: \"This is the ___ book I have ever read.\"", options: ["best", "goodest", "better", "most best"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the option opposite in meaning to the word VERBOSE", options: ["Concise", "Wordy", "Lengthy", "Talkative"], correctIndex: 0 },
        { topic: "Lexis", text: "Choose the word that means \"to give up a claim or right\"", options: ["Waive", "Retain", "Claim", "Assert"], correctIndex: 0 },
        { topic: "Grammar", text: "Choose the correct sentence", options: ["Between you and me, this is wrong.", "Between you and I, this is wrong.", "Between you and myself, this is wrong.", "Between I and you, this is wrong."], correctIndex: 0 },
      ],
    },
  },
  {
    code: "BIO",
    name: "Biology",
    content: {
      WAEC: [
        { topic: "Cell biology", text: "The basic unit of life is the", options: ["Cell", "Tissue", "Organ", "Organelle"], correctIndex: 0 },
        { topic: "Cell biology", text: "Which organelle is responsible for photosynthesis in plant cells?", options: ["Chloroplast", "Mitochondrion", "Nucleus", "Ribosome"], correctIndex: 0 },
        { topic: "Transport in plants", text: "The process by which plants lose water vapour through their leaves is called", options: ["Transpiration", "Respiration", "Photosynthesis", "Osmosis"], correctIndex: 0 },
        { topic: "Circulatory system", text: "Which blood vessel carries oxygenated blood away from the heart to the body?", options: ["Aorta", "Vena cava", "Pulmonary artery", "Pulmonary vein"], correctIndex: 0 },
        { topic: "Reproduction in plants", text: "The male reproductive part of a flower is called the", options: ["Stamen", "Pistil", "Sepal", "Petal"], correctIndex: 0 },
        { topic: "Photosynthesis", text: "Which gas is used by plants during photosynthesis?", options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"], correctIndex: 0 },
        { topic: "Cell division", text: "The process of cell division that produces gametes is called", options: ["Meiosis", "Mitosis", "Binary fission", "Budding"], correctIndex: 0 },
        { topic: "Excretion", text: "Which of these is a function of the liver?", options: ["Detoxification", "Gaseous exchange", "Filtration of blood cells", "Production of insulin"], correctIndex: 0 },
        { topic: "Genetics", text: "The study of heredity and variation is called", options: ["Genetics", "Ecology", "Taxonomy", "Physiology"], correctIndex: 0 },
        { topic: "Characteristics of living things", text: "Which of these is NOT a characteristic of living things?", options: ["Rusting", "Growth", "Reproduction", "Respiration"], correctIndex: 0 },
        { topic: "Respiration", text: "The exchange of gases in the lungs occurs in the", options: ["Alveoli", "Bronchi", "Trachea", "Larynx"], correctIndex: 0 },
        { topic: "Hormones", text: "Which hormone regulates blood sugar level?", options: ["Insulin", "Adrenaline", "Thyroxine", "Testosterone"], correctIndex: 0 },
        { topic: "Transport in plants", text: "The permanent tissue that transports water in plants is", options: ["Xylem", "Phloem", "Cambium", "Epidermis"], correctIndex: 0 },
        { topic: "Nutrition", text: "Which of these diseases is caused by a deficiency of vitamin C?", options: ["Scurvy", "Rickets", "Beriberi", "Kwashiorkor"], correctIndex: 0 },
        { topic: "Excretion", text: "The functional unit of the kidney is the", options: ["Nephron", "Neuron", "Alveolus", "Nephridium"], correctIndex: 0 },
      ],
      NECO: [
        { topic: "Ecology", text: "Which of these organisms is a decomposer?", options: ["Mushroom", "Grasshopper", "Lion", "Eagle"], correctIndex: 0 },
        { topic: "Photosynthesis", text: "The green pigment found in plant leaves is called", options: ["Chlorophyll", "Haemoglobin", "Melanin", "Carotene"], correctIndex: 0 },
        { topic: "Nervous system", text: "Which part of the human brain controls balance and coordination?", options: ["Cerebellum", "Cerebrum", "Medulla oblongata", "Hypothalamus"], correctIndex: 0 },
        { topic: "Reproduction", text: "Which of these is an example of asexual reproduction?", options: ["Budding in yeast", "Fertilization in humans", "Pollination in flowers", "Mating in birds"], correctIndex: 0 },
        { topic: "Transport", text: "The movement of water from a region of high concentration to low concentration through a semi-permeable membrane is called", options: ["Osmosis", "Diffusion", "Active transport", "Plasmolysis"], correctIndex: 0 },
        { topic: "Disease", text: "Which of these is a vector for malaria?", options: ["Female Anopheles mosquito", "Housefly", "Tsetse fly", "Cockroach"], correctIndex: 0 },
        { topic: "Circulatory system", text: "The chamber of the heart that pumps blood to the lungs is the", options: ["Right ventricle", "Left ventricle", "Right atrium", "Left atrium"], correctIndex: 0 },
        { topic: "Cell biology", text: "A group of similar cells performing the same function is called a", options: ["Tissue", "Organ", "System", "Organelle"], correctIndex: 0 },
        { topic: "Ecology", text: "Ecology is best defined as the study of", options: ["Organisms and their environment", "Cells and tissues", "Heredity and variation", "Classification of organisms"], correctIndex: 0 },
        { topic: "Digestion", text: "Which of these enzymes digests starch in the mouth?", options: ["Salivary amylase", "Pepsin", "Trypsin", "Lipase"], correctIndex: 0 },
        { topic: "Growth and development", text: "The stage of insect metamorphosis between larva and adult is called", options: ["Pupa", "Nymph", "Zygote", "Embryo"], correctIndex: 0 },
        { topic: "Ecology", text: "Which of these best describes a food chain?", options: ["A sequence showing energy transfer between organisms", "A list of foods eaten by humans", "A group of predators only", "A cycle of water in nature"], correctIndex: 0 },
        { topic: "Reproduction in plants", text: "The part of a seed that develops into the root is the", options: ["Radicle", "Plumule", "Cotyledon", "Testa"], correctIndex: 0 },
        { topic: "Nutrition", text: "Which of these is NOT a mode of nutrition in plants?", options: ["Holozoic", "Autotrophic", "Parasitic", "Saprophytic"], correctIndex: 0 },
        { topic: "Genetics", text: "The number of chromosomes in a normal human somatic cell is", options: ["46", "23", "44", "48"], correctIndex: 0 },
      ],
      UTME: [
        { topic: "Cell biology", text: "Which of these is described as the powerhouse of the cell?", options: ["Mitochondrion", "Nucleus", "Ribosome", "Golgi body"], correctIndex: 0 },
        { topic: "Photosynthesis", text: "Photosynthesis takes place mainly in the", options: ["Leaf", "Root", "Stem", "Flower"], correctIndex: 0 },
        { topic: "Circulatory system", text: "Which blood cells are responsible for fighting infection?", options: ["White blood cells", "Red blood cells", "Platelets", "Plasma cells"], correctIndex: 0 },
        { topic: "Genetics", text: "The process by which offspring inherit traits from parents is called", options: ["Heredity", "Variation", "Evolution", "Selection"], correctIndex: 0 },
        { topic: "Ecology", text: "Which of these is a primary consumer in a food chain?", options: ["Grasshopper", "Lion", "Hawk", "Snake"], correctIndex: 0 },
        { topic: "Excretion", text: "The largest organ in the human body is the", options: ["Skin", "Liver", "Lungs", "Heart"], correctIndex: 0 },
        { topic: "Excretion", text: "Which of these is an excretory product in humans?", options: ["Urea", "Glucose", "Protein", "Starch"], correctIndex: 0 },
        { topic: "Classification", text: "The scientific study of fungi is called", options: ["Mycology", "Bacteriology", "Virology", "Entomology"], correctIndex: 0 },
        { topic: "Reproduction in plants", text: "Which part of the flower develops into a fruit after fertilization?", options: ["Ovary", "Ovule", "Stigma", "Anther"], correctIndex: 0 },
        { topic: "Classification", text: "Which of these is a characteristic of arthropods?", options: ["Jointed legs", "Backbone", "Feathers", "Mammary glands"], correctIndex: 0 },
        { topic: "Digestion", text: "The process of breaking down food into simpler, absorbable substances is called", options: ["Digestion", "Egestion", "Absorption", "Assimilation"], correctIndex: 0 },
        { topic: "Nutrition", text: "Which vitamin is produced when skin is exposed to sunlight?", options: ["Vitamin D", "Vitamin A", "Vitamin C", "Vitamin K"], correctIndex: 0 },
        { topic: "Evolution", text: "Which of these is a vestigial organ in humans?", options: ["Appendix", "Liver", "Kidney", "Pancreas"], correctIndex: 0 },
        { topic: "Support and movement", text: "Which type of joint is found at the elbow?", options: ["Hinge joint", "Ball and socket joint", "Pivot joint", "Gliding joint"], correctIndex: 0 },
        { topic: "Growth and development", text: "The process by which a caterpillar changes into a butterfly is called", options: ["Metamorphosis", "Fertilization", "Germination", "Pollination"], correctIndex: 0 },
      ],
    },
  },
  {
    code: "CHM",
    name: "Chemistry",
    content: {
      WAEC: [
        { topic: "Atomic structure", text: "The atomic number of an element is the number of ___ in its nucleus", options: ["Protons", "Neutrons", "Electrons", "Nucleons"], correctIndex: 0 },
        { topic: "Physical and chemical changes", text: "Which of these is an example of a physical change?", options: ["Melting of ice", "Rusting of iron", "Burning of wood", "Souring of milk"], correctIndex: 0 },
        { topic: "Acids, bases and salts", text: "The pH of a neutral solution at room temperature is", options: ["7", "0", "14", "1"], correctIndex: 0 },
        { topic: "Reactions of metals", text: "Which gas is produced when a metal reacts with a dilute acid?", options: ["Hydrogen", "Oxygen", "Carbon dioxide", "Nitrogen"], correctIndex: 0 },
        { topic: "Separation techniques", text: "Which process separates a dissolved solid from a liquid by heating off the liquid?", options: ["Evaporation", "Filtration", "Decantation", "Sieving"], correctIndex: 0 },
        { topic: "Periodic table", text: "Which of these is a noble gas?", options: ["Argon", "Chlorine", "Nitrogen", "Hydrogen"], correctIndex: 0 },
        { topic: "Atomic structure", text: "The number of electrons in the outermost shell of an atom is called its", options: ["Valence electrons", "Atomic number", "Mass number", "Isotope"], correctIndex: 0 },
        { topic: "Acids, bases and salts", text: "Which of these is a strong acid?", options: ["Hydrochloric acid", "Ethanoic acid", "Carbonic acid", "Citric acid"], correctIndex: 0 },
        { topic: "Chemical formulae", text: "The chemical formula for table salt is", options: ["NaCl", "KCl", "CaCl₂", "NaOH"], correctIndex: 0 },
        { topic: "Redox reactions", text: "Which of these processes involves the loss of electrons?", options: ["Oxidation", "Reduction", "Neutralization", "Hydrolysis"], correctIndex: 0 },
        { topic: "Qualitative analysis", text: "Which of these is used to test for the presence of starch?", options: ["Iodine solution", "Litmus paper", "Benedict's solution", "Universal indicator"], correctIndex: 0 },
        { topic: "Stoichiometry", text: "The molar mass of water (H₂O) is approximately", options: ["18 g/mol", "16 g/mol", "20 g/mol", "2 g/mol"], correctIndex: 0 },
        { topic: "Periodic table", text: "Which of these elements is a metalloid?", options: ["Silicon", "Sodium", "Sulphur", "Chlorine"], correctIndex: 0 },
        { topic: "Acids, bases and salts", text: "The reaction between an acid and a base to form a salt and water is called", options: ["Neutralization", "Oxidation", "Reduction", "Hydrolysis"], correctIndex: 0 },
        { topic: "Periodic table", text: "Which of these is the most reactive group of metals?", options: ["Alkali metals", "Alkaline earth metals", "Transition metals", "Noble gases"], correctIndex: 0 },
      ],
      NECO: [
        { topic: "Atomic structure", text: "Which particle has no electric charge?", options: ["Neutron", "Proton", "Electron", "Ion"], correctIndex: 0 },
        { topic: "Changes of state", text: "The process of converting a gas directly to a solid is called", options: ["Deposition", "Sublimation", "Condensation", "Freezing"], correctIndex: 0 },
        { topic: "Organic chemistry", text: "Which of these compounds is an example of an alkane?", options: ["Methane", "Ethene", "Ethyne", "Benzene"], correctIndex: 0 },
        { topic: "Gases", text: "The gas that turns lime water milky is", options: ["Carbon dioxide", "Oxygen", "Hydrogen", "Nitrogen"], correctIndex: 0 },
        { topic: "Separation techniques", text: "Which of these is used as a drying agent?", options: ["Calcium chloride", "Sodium chloride", "Copper sulphate", "Potassium chloride"], correctIndex: 0 },
        { topic: "Chemical bonding", text: "The valency of oxygen in most compounds is", options: ["2", "1", "3", "4"], correctIndex: 0 },
        { topic: "Chemical bonding", text: "Which of these is a property of ionic compounds?", options: ["High melting point", "Low melting point", "Poor solubility in water", "Non-conductivity in molten state"], correctIndex: 0 },
        { topic: "Electrolysis", text: "The process by which impure copper is purified using electricity is called", options: ["Electrolysis", "Distillation", "Filtration", "Crystallization"], correctIndex: 0 },
        { topic: "Environmental chemistry", text: "Which of these gases is responsible for the greenhouse effect?", options: ["Carbon dioxide", "Nitrogen", "Argon", "Helium"], correctIndex: 0 },
        { topic: "Periodic table", text: "An element with atomic number 11 belongs to which group of the periodic table?", options: ["Group 1", "Group 2", "Group 7", "Group 8"], correctIndex: 0 },
        { topic: "Organic chemistry", text: "Which of these is the general formula for alkenes?", options: ["CnH2n", "CnH2n+2", "CnH2n-2", "CnHn"], correctIndex: 0 },
        { topic: "Reactions of metals", text: "Rust is chemically known as", options: ["Hydrated iron(III) oxide", "Iron sulphide", "Iron carbonate", "Iron chloride"], correctIndex: 0 },
        { topic: "Industrial chemistry", text: "Which of these is a catalyst used in the Haber process?", options: ["Iron", "Platinum", "Nickel", "Vanadium(V) oxide"], correctIndex: 0 },
        { topic: "Atomic structure", text: "The mass number of an atom is the sum of its", options: ["Protons and neutrons", "Protons and electrons", "Neutrons and electrons", "Protons only"], correctIndex: 0 },
        { topic: "Energy changes", text: "Which of these is an example of an endothermic reaction?", options: ["Photosynthesis", "Combustion", "Respiration", "Neutralization"], correctIndex: 0 },
      ],
      UTME: [
        { topic: "Chemical symbols", text: "The chemical symbol for potassium is", options: ["K", "P", "Po", "Pt"], correctIndex: 0 },
        { topic: "Mixtures", text: "Which of these is a homogeneous mixture?", options: ["Salt solution", "Sand and water", "Oil and water", "Muddy water"], correctIndex: 0 },
        { topic: "Stoichiometry", text: "The number of moles in 44 g of CO₂ (molar mass = 44 g/mol) is", options: ["1 mole", "2 moles", "0.5 mole", "4 moles"], correctIndex: 0 },
        { topic: "Redox reactions", text: "Which of these is a reducing agent?", options: ["Hydrogen", "Oxygen", "Chlorine", "Fluorine"], correctIndex: 0 },
        { topic: "Acids, bases and salts", text: "The pH value of an acidic solution is", options: ["Less than 7", "Equal to 7", "Greater than 7", "Equal to 14"], correctIndex: 0 },
        { topic: "Periodic table", text: "Which of these elements is found in Group 7 (the halogens)?", options: ["Chlorine", "Sodium", "Calcium", "Neon"], correctIndex: 0 },
        { topic: "Stoichiometry", text: "The formula for calculating the number of moles is", options: ["Mass / Molar mass", "Molar mass / Mass", "Mass × Molar mass", "Molar mass - Mass"], correctIndex: 0 },
        { topic: "Fuels", text: "Which of these is NOT a fossil fuel?", options: ["Hydrogen", "Coal", "Petroleum", "Natural gas"], correctIndex: 0 },
        { topic: "Redox reactions", text: "The process of adding an electron to an atom or ion is called", options: ["Reduction", "Oxidation", "Ionization", "Sublimation"], correctIndex: 0 },
        { topic: "Everyday chemistry", text: "Which of these is used in fire extinguishers to put out fire?", options: ["Carbon dioxide", "Oxygen", "Hydrogen", "Methane"], correctIndex: 0 },
        { topic: "Chemical bonding", text: "Which of these is a covalent compound?", options: ["Water", "Sodium chloride", "Calcium oxide", "Potassium bromide"], correctIndex: 0 },
        { topic: "Atomic structure", text: "The atomic number of hydrogen is", options: ["1", "2", "0", "8"], correctIndex: 0 },
        { topic: "Metals", text: "Which of these is a property of metals?", options: ["Good conductor of electricity", "Poor conductor of heat", "Dull appearance", "Brittle"], correctIndex: 0 },
        { topic: "Water", text: "Hard water contains a high concentration of", options: ["Calcium and magnesium ions", "Sodium and potassium ions", "Chloride ions only", "Sulphate ions only"], correctIndex: 0 },
        { topic: "Fuels", text: "Which of these is used as a fuel in vehicles?", options: ["Petrol", "Distilled water", "Table salt", "Chalk"], correctIndex: 0 },
      ],
    },
  },
  {
    code: "PHY",
    name: "Physics",
    content: {
      WAEC: [
        { topic: "Force", text: "The SI unit of force is the", options: ["Newton", "Joule", "Watt", "Pascal"], correctIndex: 0 },
        { topic: "Quantities", text: "Which of these is a scalar quantity?", options: ["Speed", "Velocity", "Displacement", "Acceleration"], correctIndex: 0 },
        { topic: "Density", text: "The formula for calculating density is", options: ["Mass / Volume", "Volume / Mass", "Mass × Volume", "Mass + Volume"], correctIndex: 0 },
        { topic: "Laws of motion", text: "Which of these correctly states Newton's second law of motion?", options: ["Force = mass × acceleration", "Force = mass / acceleration", "Every action has an equal and opposite reaction", "An object remains at rest unless acted upon by a force"], correctIndex: 0 },
        { topic: "Electricity", text: "The SI unit of electric current is the", options: ["Ampere", "Volt", "Ohm", "Watt"], correctIndex: 0 },
        { topic: "Heat", text: "Which process describes heat travelling through a vacuum?", options: ["Radiation", "Conduction", "Convection", "Diffusion"], correctIndex: 0 },
        { topic: "Electricity", text: "Ohm's law states that current is directly proportional to", options: ["Voltage", "Resistance", "Power", "Time"], correctIndex: 0 },
        { topic: "Optics", text: "The bending of light as it passes from one medium to another is called", options: ["Refraction", "Reflection", "Diffraction", "Dispersion"], correctIndex: 0 },
        { topic: "Pressure", text: "Which of these instruments is used to measure atmospheric pressure?", options: ["Barometer", "Thermometer", "Hygrometer", "Manometer"], correctIndex: 0 },
        { topic: "Energy", text: "The energy possessed by a body due to its motion is called", options: ["Kinetic energy", "Potential energy", "Chemical energy", "Thermal energy"], correctIndex: 0 },
        { topic: "Electricity", text: "Which of these is a good conductor of electricity?", options: ["Copper", "Rubber", "Glass", "Wood"], correctIndex: 0 },
        { topic: "Optics", text: "The image formed by a plane mirror is", options: ["Virtual and upright", "Real and inverted", "Virtual and inverted", "Real and upright"], correctIndex: 0 },
        { topic: "Electricity", text: "Which of these is the unit of electrical resistance?", options: ["Ohm", "Ampere", "Volt", "Watt"], correctIndex: 0 },
        { topic: "Pressure", text: "The principle that pressure applied to an enclosed fluid is transmitted equally in all directions is", options: ["Pascal's principle", "Archimedes' principle", "Bernoulli's principle", "Newton's principle"], correctIndex: 0 },
        { topic: "Waves", text: "Which of these waves does NOT require a medium to travel?", options: ["Electromagnetic waves", "Sound waves", "Water waves", "Seismic waves"], correctIndex: 0 },
      ],
      NECO: [
        { topic: "Motion", text: "The rate of change of velocity is called", options: ["Acceleration", "Speed", "Momentum", "Displacement"], correctIndex: 0 },
        { topic: "Laws of motion", text: "Which law states that for every action there is an equal and opposite reaction?", options: ["Newton's third law", "Newton's first law", "Newton's second law", "Law of conservation of energy"], correctIndex: 0 },
        { topic: "Energy", text: "The SI unit of energy is the", options: ["Joule", "Newton", "Watt", "Pascal"], correctIndex: 0 },
        { topic: "Simple machines", text: "Which of these is an example of a simple machine?", options: ["Lever", "Battery", "Bulb", "Resistor"], correctIndex: 0 },
        { topic: "Changes of state", text: "The process by which a liquid changes to vapour below its boiling point is called", options: ["Evaporation", "Boiling", "Condensation", "Sublimation"], correctIndex: 0 },
        { topic: "Motion", text: "Which of these correctly describes momentum?", options: ["Product of mass and velocity", "Product of mass and acceleration", "Force per unit area", "Rate of doing work"], correctIndex: 0 },
        { topic: "Electricity", text: "The device used to measure electric current in a circuit is called", options: ["Ammeter", "Voltmeter", "Galvanometer", "Ohmmeter"], correctIndex: 0 },
        { topic: "Waves", text: "Which of these is true about the speed of light in a vacuum?", options: ["It is approximately 3 × 10⁸ m/s", "It is approximately 3 × 10⁶ m/s", "It varies from place to place", "It is slower than sound"], correctIndex: 0 },
        { topic: "Motion", text: "The unbalanced force that brings a moving object to rest is called", options: ["Friction", "Gravity", "Tension", "Normal force"], correctIndex: 0 },
        { topic: "Quantities", text: "Which of these is a vector quantity?", options: ["Force", "Mass", "Time", "Energy"], correctIndex: 0 },
        { topic: "Energy", text: "The energy stored in a stretched spring is called", options: ["Elastic potential energy", "Kinetic energy", "Chemical energy", "Thermal energy"], correctIndex: 0 },
        { topic: "Heat", text: "The transfer of heat through a solid material is called", options: ["Conduction", "Convection", "Radiation", "Insulation"], correctIndex: 0 },
        { topic: "Waves", text: "The unit used to measure the frequency of a wave is the", options: ["Hertz", "Newton", "Joule", "Watt"], correctIndex: 0 },
        { topic: "Electricity", text: "Which of these best describes resistance in a circuit?", options: ["Opposition to the flow of current", "Rate of flow of charge", "Amount of energy transferred", "Potential difference across a component"], correctIndex: 0 },
        { topic: "Energy", text: "The law of conservation of energy states that energy", options: ["Cannot be created or destroyed, only transformed", "Can be created but not destroyed", "Can be destroyed but not created", "Is always lost as heat"], correctIndex: 0 },
      ],
      UTME: [
        { topic: "Power", text: "Which of these is the unit of power?", options: ["Watt", "Joule", "Newton", "Pascal"], correctIndex: 0 },
        { topic: "Gravity", text: "The weight of a body is a measure of", options: ["The gravitational force acting on it", "Its mass", "Its volume", "Its density"], correctIndex: 0 },
        { topic: "Motion", text: "Which of these is true about a body in free fall, ignoring air resistance?", options: ["It accelerates uniformly due to gravity", "It moves at constant velocity", "It decelerates", "It does not accelerate"], correctIndex: 0 },
        { topic: "Work and energy", text: "The formula for work done is", options: ["Force × Distance", "Force / Distance", "Mass × Acceleration", "Force × Time"], correctIndex: 0 },
        { topic: "Electricity", text: "Which of these is an example of an insulator?", options: ["Rubber", "Copper", "Silver", "Aluminium"], correctIndex: 0 },
        { topic: "Sound", text: "The pitch of a sound depends on its", options: ["Frequency", "Amplitude", "Wavelength alone", "Speed"], correctIndex: 0 },
        { topic: "Optics", text: "Which of these lenses is used to correct short-sightedness?", options: ["Concave lens", "Convex lens", "Cylindrical lens", "Bifocal lens"], correctIndex: 0 },
        { topic: "Changes of state", text: "The process by which a solid changes directly to a gas is called", options: ["Sublimation", "Melting", "Evaporation", "Condensation"], correctIndex: 0 },
        { topic: "Pressure", text: "Which of these is the correct SI unit for measuring pressure?", options: ["Pascal", "Newton", "Joule", "Watt"], correctIndex: 0 },
        { topic: "Electromagnetism", text: "A transformer works on the principle of", options: ["Electromagnetic induction", "Electrostatic induction", "Thermionic emission", "Photoelectric effect"], correctIndex: 0 },
        { topic: "Atomic physics", text: "Which of these particles carries a negative charge?", options: ["Electron", "Proton", "Neutron", "Positron"], correctIndex: 0 },
        { topic: "Simple machines", text: "The efficiency of a machine is given by", options: ["Useful output energy / Total input energy × 100%", "Total input energy / Useful output energy", "Input force × Output force", "Distance moved by load / Distance moved by effort"], correctIndex: 0 },
        { topic: "Modern physics", text: "Which of these best describes half-life in radioactivity?", options: ["Time taken for half of a radioactive sample to decay", "Time taken for a sample to fully decay", "Time taken for a sample to double", "Time taken to reach maximum radiation"], correctIndex: 0 },
        { topic: "Optics", text: "The image formed on the retina of the human eye is", options: ["Real and inverted", "Virtual and upright", "Real and upright", "Virtual and inverted"], correctIndex: 0 },
        { topic: "Energy sources", text: "Which of these is a renewable source of energy?", options: ["Solar energy", "Coal", "Petroleum", "Natural gas"], correctIndex: 0 },
      ],
    },
  },
];

function difficultyFor(index: number): Difficulty {
  if (index < 5) return "EASY";
  if (index < 10) return "MEDIUM";
  return "HARD";
}

async function main() {
  const admin = await prisma.platformAdmin.findFirst({ where: { role: "OWNER" }, orderBy: { createdAt: "asc" } });
  if (!admin) {
    throw new Error("No platform OWNER admin found — create one first (see DEPLOYMENT.md), then re-run this script.");
  }

  for (const subject of SUBJECTS) {
    const globalSubject = await prisma.globalSubject.upsert({
      where: { code: subject.code },
      update: { name: subject.name },
      create: { code: subject.code, name: subject.name },
    });

    for (const [examBoard, questions] of Object.entries(subject.content) as [ExamBoard, SeedQuestion[]][]) {
      const existingCount = await prisma.globalQuestion.count({
        where: { globalSubjectId: globalSubject.id, examBoard },
      });
      if (existingCount > 0) {
        console.log(`Skipping ${subject.code}/${examBoard} — ${existingCount} questions already seeded`);
        continue;
      }

      for (const [index, q] of questions.entries()) {
        await prisma.globalQuestion.create({
          data: {
            globalSubjectId: globalSubject.id,
            examBoard,
            stage: "SENIOR_SECONDARY",
            topic: q.topic,
            type: QuestionType.MULTIPLE_CHOICE,
            text: q.text,
            points: 1,
            difficulty: difficultyFor(index),
            createdByAdminId: admin.id,
            options: {
              create: q.options.map((text, i) => ({ text, isCorrect: i === q.correctIndex, order: i })),
            },
          },
        });
      }
      console.log(`Seeded ${questions.length} ${examBoard} questions for ${subject.code}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
