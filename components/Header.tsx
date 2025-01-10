import { Button } from "@/components/ui/button"
import Search from "@/components/Search"
import Image from "next/image"
import FileUpload from "@/components/FileUpload"
import { signOutUser } from "@/lib/actions/user.action"

const Header = ({userID, accountID}: {userID: string, accountID: string}) => {
  return (
    <header className="header" >
     <Search/>

     <div className="header-wrapper" >
          <FileUpload ownerId={userID} accountId={accountID}  />

          <form
            action={async (e) => {
              'use server'

              await signOutUser()
            }}
          >
            <Button
              type="submit"
              className="sign-out-button"
            >
              <Image
               src="/assets/icons/logout.svg"
               alt="logo"
               width={24}
               height={24}
               className="w-6"
              />

            </Button>
          </form>
     </div>
    </header>
  )
}

export default Header