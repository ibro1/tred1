
import { redirect, type LoaderFunctionArgs } from "@remix-run/node"
import { requireUser } from "~/helpers/auth"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user } = await requireUser(request)

  // Get the role symbols from user roles
  const roleSymbols = user.roles.map(role => role.symbol)

  // Redirect based on role symbol
  if (roleSymbols.includes("ADMIN")) {
    return redirect("/admin/dashboard")
  } else if (roleSymbols.includes("USER")) {
    return redirect("/user/dashboard")
  } else{
  return redirect('/logout')

  }

}
