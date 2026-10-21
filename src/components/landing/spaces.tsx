import Image, { type StaticImageData } from "next/image";
import boxOfficeFrontPhoto from "@/assets/venue/box-office-front.webp";
import gardenPhoto from "@/assets/venue/garden.webp";
import pavilionPhoto from "@/assets/venue/pavilion.webp";

type Space = { name: string; photo?: { src: StaticImageData; alt: string; position?: string }; needs?: string };

// Rooms named on the venue's signs. Empty-room photos only; a room without one
// shows a plain tile until the photo arrives (file name in `needs`).
const SPACES: Space[] = [
  {
    name: "Pavilion",
    photo: { src: pavilionPhoto, alt: "The Pavilion: coral quilted chairs along a cushioned banquette", position: "62% 50%" },
  },
  {
    name: "Box Office",
    photo: { src: boxOfficeFrontPhoto, alt: "The Box Office booths behind arched brass screens" },
  },
  {
    name: "Garden",
    photo: { src: gardenPhoto, alt: "The Garden: palms and green chairs under the neon GARDEN sign", position: "45% 30%" },
  },
];

/** Gallery of the rooms: a swipeable row on phones, an asymmetric grid from tablets up. */
export function Spaces() {
  return (
    <section className="bg-paper py-16 md:px-gutter md:py-24" aria-labelledby="spaces-title">
      <div className="mx-auto max-w-6xl px-gutter md:px-0" data-reveal>
        <p className="text-eyebrow font-semibold uppercase text-brass-ink">Spaces</p>
        <h2 id="spaces-title" className="mt-3 font-display text-headline font-medium">
          The rooms
        </h2>
      </div>

      <ul className="lp-spaces mt-10">
        {SPACES.map((space) => (
          <li key={space.name}>
            <figure className="flex h-full flex-col">
              <div className="lp-space-media">
                {space.photo ? (
                  <Image
                    src={space.photo.src}
                    alt={space.photo.alt}
                    fill
                    sizes="(min-width: 48rem) 50vw, 80vw"
                    placeholder="blur"
                    className="object-cover"
                    style={{ objectPosition: space.photo.position }}
                  />
                ) : (
                  <p className="grid h-full place-items-center text-sm text-muted">Photo to come</p>
                )}
              </div>
              <figcaption className="mt-3 font-display text-lead">{space.name}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
