import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"

import {
  getPaginationConfigs,
  getPaginationOptions,
  PaginationNavigation,
  PaginationSearch,
} from "~/components/shared/pagination"
import { PostItemLink } from "~/components/shared/post-item"
import { Iconify } from "~/components/ui/iconify"
import { sanitizePosts } from "~/helpers/post"
import { prisma } from "~/libs/db.server"
import { createMeta } from "~/utils/meta"

export const meta: MetaFunction = () =>
  createMeta({
    title: `Posts`,
    description: `Various posts`,
  })

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const config = getPaginationConfigs({ request })
  const contains = config.queryParam

  /**
   * Custom query config, can be different for any cases
   * This show the 1st page result even if there's no query
   */
  const where = !contains
    ? {
        status: {
          OR: [{ symbol: "PUBLISHED" }, { symbol: "ARCHIVED" }],
        },
      }
    : {
        OR: [{ title: { contains } }, { slug: { contains } }],
        status: {
          OR: [{ symbol: "PUBLISHED" }, { symbol: "ARCHIVED" }],
        },
      }

  /**
   * As searching and filtering might be complex,
   * use Prisma directly, it might be refactored later into the models
   */
  const [totalItems, posts] = await prisma.$transaction([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      skip: config.skip,
      take: config.limitParam,
      orderBy: { updatedAt: "desc" },
      include: {
        images: { select: { id: true, url: true } },
        user: { include: { images: { select: { id: true, url: true } } } },
      },
    }),
  ])

  return json({
    ...getPaginationOptions({ request, totalItems }),
    posts: sanitizePosts(posts),
  })
}

export default function SearchRoute() {
  const { posts, ...loaderData } = useLoaderData<typeof loader>()

  return (
    <div className="site-container space-y-10">
      <header className="site-header">
        <h1 className="inline-flex items-center gap-2 text-primary">
          <Iconify icon="ph:scroll-duotone" />
          <span>Posts</span>
        </h1>
      </header>

      <section className="site-section">
        <PaginationSearch
          itemName="post"
          searchPlaceholder="Search posts with keyword..."
          count={posts.length}
          {...loaderData}
        />
      </section>

      <section className="site-section">
        <ul className="space-y-8">
          {posts.map(post => (
            <PostItemLink key={post.id} post={post as any} />
          ))}
        </ul>
      </section>

      <section className="site-section">
        <PaginationNavigation {...loaderData} />
      </section>
    </div>
  )
}
