'use server'

import { createAdminClient, createSessionClient } from "../appwrite"
import {InputFile} from "node-appwrite/file"
import { appwriteConfig } from "../appwrite/config"
import { ID, Models, Query } from "node-appwrite"
import { constructFileUrl, getFileType, parseStringfy } from "../utils"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "./user.action"

export const uploadFile = async (
    {
        file,
        ownerId,
        accountId,
        path
    }: UploadFileProps
) => {
  const {storage, databases} = await createAdminClient()

  try {
    //read file
    const inputFile = InputFile.fromBuffer(file, file.name)//from blob we read the input file
    //bucket is where we are going to store the file
    const bucketFile = await storage.createFile(appwriteConfig.bucketId, ID.unique(), inputFile)//then create a file in the bucket
    
    const fileDocument = {
        type: getFileType(bucketFile.name).type,
        name: bucketFile.name,
        url: constructFileUrl(bucketFile.$id),
        extension: getFileType(bucketFile.name).extension,
        size: bucketFile.sizeOriginal,
        owner: ownerId,
        accountId,
        users: [],
        bucketFileId: bucketFile.$id,
    }

    const newFile = await databases.createDocument(
        appwriteConfig.databaseId, 
        appwriteConfig.filesCollectionId, 
        ID.unique(), 
        fileDocument)
        .catch(async (error: unknown) => {
            await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id)
            handleError(error, "Failed to create file document")
        })

        revalidatePath(path)

        return parseStringfy(newFile)

  } catch (error) {
    handleError(error, "Failed to upload file")
  }
}

const handleError = (error: unknown, message: string) => {
    console.log(error, message)

    throw error
}

const createQueries = (
  currentUser: Models.Document, 
  types: string[],
  searchText: string,
  sort: string,
  limit?: number
) => {
  const queires = [
    //an array of queries
    Query.or([
        Query.equal("owner", [currentUser.$id]),
        Query.contains("users", [currentUser.email]),
    ])
  ]

  if(types.length > 0) {
    queires.push(Query.equal("type", types))
  }
  if(searchText) {
    queires.push(Query.contains("name", searchText))
  }
  if(limit) {
    queires.push(Query.limit(limit))
  }
  if(sort) {

    const [sortBy, orderBy] = sort.split("-")

    queires.push(
     orderBy === "asc" 
     ? Query.orderAsc(sortBy) 
     : Query.orderDesc(sortBy)
    )
  }

  return queires
}

export const getFiles = async ({
  types = [], 
  searchText = "", 
  sort = "$createdAt-desc", 
  limit
}: GetFilesProps) => {

    const {databases} = await createAdminClient()

    try {
        //get by user 
        const currentUser = await getCurrentUser()

        if(!currentUser) throw new Error("User not found")

        const queries = createQueries(currentUser, types, searchText, sort, limit)

      
        const files = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.filesCollectionId,
            queries
        )

      //  console.log({currentUser, queries})

        return parseStringfy(files)

    } catch (error) {
        handleError(error, "Failed to get files")
    }
}

export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  const {databases} = await createAdminClient()

  try {
    const newName = `${name}.${extension}`
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        name: newName,
      },
    )

    revalidatePath(path)
    return parseStringfy(updatedFile)

  } catch (error) {
    handleError(error, "Failed to rename file")
  }
}

export const updatedFileUsers = async ({
  fileId, 
  emails,
  path
}: UpdateFileUsersProps) => {

  const { databases } = await createAdminClient()

  try {
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {users: emails}
    )

    revalidatePath(path)
    return parseStringfy(updatedFile)

  } catch (error) {
    handleError(error, "Failed to rename file")
  }
}

export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: DeleteFileProps) => {

  const {storage, databases} = await createAdminClient()

  try {
    
    const deletedFile = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId
    )

    if(deletedFile) {
      await storage.deleteFile(appwriteConfig.bucketId, bucketFileId)
    }

    revalidatePath(path)
    return parseStringfy({status: "success"})
    
  } catch (error) {
    handleError(error, "Failed to rename file")
  }
}

export async function getTotalSpaceUsed() {
  try {
    const {databases} = await createSessionClient()
    const currentUser = await getCurrentUser()
    
    if(!currentUser) {
      throw new Error("Used is not authenticated")
    }

    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.equal("owner", [currentUser.$id])],
    )

    const totalSpace = {
      image: {size: 0, latestDate: ""},
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024,
    }

    files.documents.forEach((file) => {
      const fileType = file.type as FileType
      totalSpace[fileType].size += file.size
      totalSpace.used += file.size

      if(!totalSpace[fileType].latestDate || new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)) {
        totalSpace[fileType].latestDate = file.$updatedAt
      }
    })

    return parseStringfy(totalSpace)

  } catch (error) {
    handleError(error, "Failed to get total space used")
  }
}