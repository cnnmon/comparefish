const BLOCKED_WORDS = new Set([
  "camel","arian","aryan","beaner","beaners","chinc","chincs","chink","coon",
  "coons","dago","dagos","darkie","dink","dinks","ecchi","fag","fagg","fagged",
  "fagging","faggit","faggitt","faggot","faggs","fagot","fagots","fags","gook",
  "gooks","heeb","injun","jailbait","jap","japs","jigaboo","jiggaboo",
  "jiggerboo","kike","kikes","kkk","klan","massa","moolie","n1gga","n1gger",
  "nambla","nazi","nazism","negro","nigg3r","nigg4h","nigga","niggah","niggas",
  "niggaz","nigger","niggers","niggle","niglet","paedophile","paki","pedo",
  "pedobear","pedophile","pedophilia","pedophiliac","pillowbiter","polack",
  "pollock","poof","raghead","reetard","retard","ritard","rtard","slanteye",
  "spic","spick","spik","spiks","swastika","tard","towelhead","tranny","wetback",
]);

export function containsBlockedWord(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  return words.some((w) => BLOCKED_WORDS.has(w));
}
