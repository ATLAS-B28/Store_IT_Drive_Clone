"use client";

import { cn, convertFileToUrl, getFileType } from '@/lib/utils';
import React, { useCallback, useState } from 'react'
import {useDropzone} from 'react-dropzone'
import { Button } from './ui/button';
import Image from 'next/image';
import ThumbNail from './ThumbNail';
import { MAX_FILE_SIZE } from '@/constants';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/lib/actions/file.action';
import { usePathname } from 'next/navigation';

interface Props {
  ownerId: string;
  accountId: string;
  className?: string;
}

const FileUpload = ({ownerId, accountId, className}: Props) => {

  const path = usePathname()
  const {toast} = useToast()
  const [files, setFiles] = useState<File[]>([])

  const onDrop = useCallback( async (acceptedFiles: File[]) => {
  setFiles(acceptedFiles)

  const uploadPromises = acceptedFiles.map(async (file) => {

    if(file.size > MAX_FILE_SIZE) {
      setFiles((prevFiles) => prevFiles.filter(f => f.name !== file.name))

      return toast({
        description: (
          <p className="body-2 text-white">
            <span className="font-semibold">
              {file.name}
            </span> is too large. Max file size is 50 MB
          </p>
        ),
        className: "error-toast",
      })
    }

    return uploadFile({file, ownerId, accountId, path})
    .then((uploadedFile) => {
      if(uploadedFile) {
        setFiles((prevFiles) => prevFiles.filter(f => f.name !== file.name))
      }
    })
    //for each uploaded file we call a then we remove it
    //by calling the setFiles function
    //where we filter through the files and remove the file 
    //uploaded successfully
  })

  await Promise.all(uploadPromises)
  }, [ownerId, accountId, path])//unless any of this dependencies changes we 
  //don't have to recall the function

  const handleRemoveFile = (e: React.MouseEvent<HTMLImageElement, MouseEvent>, filename: string) => {
    e.stopPropagation()
    setFiles((prevFiles) => prevFiles.filter(file => file.name !== filename))
  }

  const {getRootProps, getInputProps} = useDropzone({onDrop})

  return (
    <div {...getRootProps()} className='cursor-pointer'>
      <input {...getInputProps()} />
      <Button 
       type="button" 
       className={cn(
        'uploader-button',
        className
      )}>
        <Image
          src="/assets/icons/upload.svg"
          alt="upload"
          width={24}
          height={24}
        />
        <p>Upload</p>
      </Button>

      {files.length > 0 && (
        <ul className="uploader-preview-list">
         <h4 className="h-4 text-light-100">Uploading</h4>

         {files.map((file, index) => {
          const {type, extension} = getFileType(file.name)

          return (
            <li 
             key={`${file.name}-${index}`}
             className="uploader-preview-item">
             <div className='flex items-center gap-3'>
             <ThumbNail
                    type={type}
                    extension={extension}
                    url={convertFileToUrl(file)}
                  />
              <div className="preview-item-name">
               {file.name}
               <Image
                src="/assets/icons/file-loader.gif"
                alt="loader"
                width={80}
                height={26}
                />
              </div>
             </div>

             <Image
              src="/assets/icons/remove.svg"
              alt="close"
              width={24}
              height={24}
              onClick={(e) => handleRemoveFile(e, file.name)}
              unoptimized={true}
              />
             
            </li>
          )
         })}
        </ul>
      )}

    </div>
  )
}

export default FileUpload